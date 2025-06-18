from flask import Flask, render_template, Response, send_file
from ultralytics import YOLO
import cv2
import os
import math
import datetime
import numpy as np
import random
from concurrent.futures import ThreadPoolExecutor
import json

app = Flask(__name__, static_url_path='/static')

# Load the YOLO model (adjust the path as needed)
model = YOLO("yolo11n.pt")  # Replace with your model path

classNames = ["person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck", "boat", "traffic light",
              "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
              "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
              "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
              "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
              "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "sofa",
              "pottedplant", "bed", "diningtable", "toilet", "tvmonitor", "laptop", "mouse", "remote", "keyboard",
              "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors",
              "teddy bear", "hair drier", "toothbrush"]

randomColors = (random.randint(50, 255), random.randint(50, 255), random.randint(50, 255))

# Define the center, axes, and angle of the ellipse
center = (640, 0)  # Adjusted center coordinates
axes = (int(np.sqrt(1280**2 + 720**2) / 2), 50)
angle = 0

# Initialize status bar parameters
status_bar_height = 50
status_bar_color = (0, 0, 0)

# Set the curvature variable for the curved line
curvature = 30

# Initialize the video capture
cap = cv2.VideoCapture('video.mp4')  # 0 for the default camera
cap.set(3, 1280)  # CV_CAP_PROP_FRAME_WIDTH
cap.set(4, 720)   # CV_CAP_PROP_FRAME_HEIGHT

def log_detection(detected_objects):
    """Log detected objects to a text file with a readable format"""
    try:
        if not detected_objects:  # Skip if no objects detected
            return
            
        now = datetime.datetime.now()
        current_time = now.strftime("%Y-%m-%d %H:%M:%S")
        
        # Open file in append mode
        with open("detected_objects.txt", "a", encoding="utf-8") as f:
            # Write a timestamp header for this detection batch
            f.write(f"\n=== Detection Log - {current_time} ===\n")
            
            for i, obj in enumerate(detected_objects, 1):
                name, coords, detection_time = obj
                x1, y1, x2, y2 = coords
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2
                
                # Write object information in a readable format
                f.write(f"{i:2d}. Object: {name:<15} | "
                       f"Position: ({center_x:6.1f}, {center_y:6.1f}) | "
                       f"Bounding Box: ({x1}, {y1}) to ({x2}, {y2}) | "
                       f"Time: {detection_time}\n")
            
            f.write(f"--- Total objects detected: {len(detected_objects)} ---\n")

    except Exception as e:
        print(f"Error writing to file: {e}")

def read_detected_objects_from_txt():
    """Read detected objects from txt file and convert to JSON format for the API"""
    try:
        if not os.path.exists("detected_objects.txt"):
            return []
        
        objects_list = []
        current_batch_time = None
        
        with open("detected_objects.txt", "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        for line in lines:
            line = line.strip()
            
            # Check for timestamp headers
            if line.startswith("=== Detection Log -") and line.endswith("==="):
                # Extract timestamp from header
                timestamp_part = line.replace("=== Detection Log - ", "").replace(" ===", "")
                current_batch_time = timestamp_part
                continue
            
            # Parse object lines (format: "1. Object: car | Position: (500.5, 305.5) | ...")
            if line and line[0].isdigit() and ". Object:" in line:
                try:
                    # Split the line into parts
                    parts = line.split(" | ")
                    
                    # Extract object name
                    object_part = parts[0].split("Object: ")[1].strip()
                    
                    # Extract position coordinates
                    position_part = parts[1].split("Position: ")[1]
                    # Remove parentheses and split coordinates
                    coords_str = position_part.replace("(", "").replace(")", "")
                    x, y = map(float, coords_str.split(", "))
                    
                    # Create object entry
                    obj_entry = {
                        "time": current_batch_time or "Unknown",
                        "object": object_part,
                        "coordinates": [x, y]
                    }
                    
                    objects_list.append(obj_entry)
                    
                except (IndexError, ValueError) as e:
                    print(f"Error parsing line: {line} - {e}")
                    continue
        
        return objects_list
        
    except Exception as e:
        print(f"Error reading detected objects file: {e}")
        return []

def process_frame(frame):
    # Initialize an empty list to store detected objects
    detected_objects = []

    # Process the frame with YOLO
    results = model(frame)

    # Draw results (adjust as needed)
    for r in results:
        boxes = r.boxes
        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            w, h = x2 - x1, y2 - y1

            # Find the center of the object and the center of the text
            object_center = ((x1 + x2) // 2, (y1 + y2) // 2)
            conf = math.ceil((box.conf[0] * 100)) / 100
            cls = int(box.cls[0])
            name = classNames[cls]
            
            # Get current time
            now = datetime.datetime.now()
            current_time = now.strftime("%H:%M:%S")

            # Create a tuple with class, coordinates, and time
            object_data = (name, (x1, y1, x2, y2), current_time)
            
            # Append the tuple to the list of detected objects
            detected_objects.append(object_data)

            # Generate colors based on confidence
            color_intensity = int(conf * 255)
            randomColors = (
                random.randint(50, min(color_intensity, 255)),
                random.randint(50, min(color_intensity, 255)),
                random.randint(50, min(color_intensity, 255))
            )

            textPos = (max(0, x1), max(24, y1))
            x, y = textPos
            text = f"{name} {conf}"

            text_scale = 0.7  # to control all the sizes
            text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, text_scale, 1)[0]
            text_center = (max(0, x1) + text_size[0] // 2, max(24, y1) - text_size[1] // 2)

            fontScale = text_scale
            textThickness = 2 
            textColor = (0, 0, 0)
            bgColor = randomColors
            pad_x, pad_y = int(10 * text_scale), int(10 * text_scale)
            Opacity = 1
            (t_w, t_h) = text_size

            overlay = frame.copy()  # copying the image

            # Draw 
            cv2.circle(overlay, object_center, int(4 * text_scale), (0, 0, 0), -1)  
            cv2.line(overlay, object_center, text_center, (0, 0, 0), 1) 
            cv2.rectangle(overlay, (x - pad_x, y + pad_y), (x + t_w + pad_x, y - t_h - pad_y), bgColor, -1)  # draw rectangle
            cv2.putText(overlay, text, (max(0, x1), max(24, y1)), cv2.FONT_HERSHEY_SIMPLEX, fontScale, textColor, textThickness)  # draw text
            cv2.rectangle(overlay, (max(0, x1) - pad_x, max(24, y1) - t_h - pad_y), (max(0, x1) + t_w + pad_x, max(24, y1) + pad_y), (0, 25, 30), int(2 * text_scale), cv2.LINE_AA)

            frame = cv2.addWeighted(overlay, Opacity, frame, 1 - Opacity, 0)  # overlaying on the image.

    log_detection(detected_objects)
    return frame, detected_objects

def gen_frames():
    with ThreadPoolExecutor() as executor:
        detected_objects = []
        while True:
            success, frame = cap.read()  # Read the camera frame
            if not success:
                break
            # Draw status bar with curved underline
            # time_str = datetime.datetime.now().strftime('%H:%M:%S')
            # date_str = datetime.datetime.now().strftime('%Y-%m-%d')
            # status_bar = f'Time: {time_str} | Date: {date_str} | Weather: Sunny, 29c'
            # Prepare status bar information
            time_str = datetime.datetime.now().strftime('%H:%M:%S')
            date_str = datetime.datetime.now().strftime('%Y-%m-%d')
            status_bar = f'Time: {time_str} | Date: {date_str} | Objects: {len(detected_objects) if detected_objects else 0}'
            text_size = cv2.getTextSize(status_bar, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
            image_height, image_width, _ = frame.shape
            
            # # Draw the curved line
            # cv2.ellipse(frame, (image_width // 2, status_bar_height - curvature), (image_width // 2, curvature), 0, 0, 180, (255, 255, 255), 1)
            
            # # Draw the status bar text
            # cv2.putText(frame, status_bar, ((image_width - text_size[0]) // 2, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

            # Process the frame asynchronously
            frame, detected_objects = executor.submit(process_frame, frame).result()

            _, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/assets/<path:path>')
def serve_assets(path):
    if path.endswith('.ttf') or path.endswith('.otf'):
        return send_file(os.path.join('fonts', path), mimetype='application/font-ttf')
    elif path.endswith('.gltf'):  
        return send_file(os.path.join('assets', path), mimetype='model/gltf')
    elif path.endswith('.html'):  # New condition for HTML files
        return send_file(os.path.join('assets', path), mimetype='text/html')
    # do for icons folder
    elif path.endswith('.png'):
        return send_file(os.path.join('assets', path), mimetype='image/png')
    else:
        return send_file(os.path.join('assets', path), mimetype='application/octet-stream')

@app.route('/detected_objects.json')
def get_detected_objects():
    """Serve the detected objects as JSON (converted from txt file)"""
    try:
        objects_list = read_detected_objects_from_txt()
        return json.dumps(objects_list), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        print(f"Error serving detected objects: {e}")
        return json.dumps([]), 500, {'Content-Type': 'application/json'}

@app.route('/detected_objects.txt')
def get_detected_objects_txt():
    """Serve the raw txt file"""
    try:
        return send_file('detected_objects.txt', mimetype='text/plain')
    except FileNotFoundError:
        return "No detected objects file found", 404

# Alternative: If you want to serve all files from root
@app.route('/<path:filename>')
def serve_root_files(filename):
    """Serve files from the root directory"""
    if filename.endswith('.json'):
        try:
            return send_file(filename, mimetype='application/json')
        except FileNotFoundError:
            return json.dumps([]), 404, {'Content-Type': 'application/json'}
    elif filename.endswith('.txt'):
        try:
            return send_file(filename, mimetype='text/plain')
        except FileNotFoundError:
            return "File not found", 404
    # For other file types, you can add more conditions or return 404
    return "File not found", 404

if __name__ == '__main__':
    # Create initial log file with header if it doesn't exist
    if not os.path.exists("detected_objects.txt"):
        with open("detected_objects.txt", "w", encoding="utf-8") as f:
            f.write("YOLO Object Detection Log\n")
            f.write("=" * 50 + "\n")
            f.write(f"Log started: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
    # app.run(host='0.0.0.0')
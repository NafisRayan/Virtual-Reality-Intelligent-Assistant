from ultralytics import YOLO
import sys

try:
    # Load the YOLO11 model
    model = YOLO("yolo11n.pt")

    # Export the model to ONNX format
    success = model.export(format="onnx")  # creates 'yolo11n.onnx'
    
    if success:
        # Load the exported ONNX model
        onnx_model = YOLO("yolo11n.onnx")
        
        # Run inference
        results = onnx_model("https://ultralytics.com/images/bus.jpg")
    else:
        print("Model export failed")

except ModuleNotFoundError as e:
    print(f"Error: Required module not found. Please install required packages: {e}")
    sys.exit(1)
except Exception as e:
    print(f"An error occurred: {e}")
    sys.exit(1)
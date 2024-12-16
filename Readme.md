# Three.js VR Hand Input with Flask and YOLO

This project is a web-based application that integrates Three.js for 3D rendering, WebXR for VR hand input, and Flask for serving the application. It also uses YOLO for object detection in video feeds.

## Features

- **3D Environment**: Built with Three.js, allowing for interactive 3D scenes.
- **VR Hand Input**: Utilizes WebXR for hand tracking and interaction.
- **Object Detection**: Integrates YOLO for real-time object detection in video feeds.
- **Flask Backend**: Serves the application and handles video processing.
- **Interactive UI**: Includes a map and chat system embedded in iframes.

## Screenshots  

Here are some screenshots of the app showcasing its key features and design:  

<img src="threejsDemo.png" alt="Home Screen" width="1000" />  

## Prerequisites

- Python 3.x
- Node.js and npm (for Three.js and other frontend dependencies)
- Flask
- OpenCV
- Ultralytics YOLO

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/NafisRayan/Thesis
   cd Thesis
   ```

2. **Set up the Python environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

5. **Download the YOLO model**:
   - Ensure you have the YOLO model file (`yolo11n.pt`) in the project directory or update the path in `app.py`.

## Usage

1. **Run the Flask application**:
   ```bash
   python app.py
   ```

2. **Access the application**:
   - Open your web browser and go to `http://localhost:5000`.

## Project Structure

- `app.py`: The main Flask application file.
- `templates/index.html`: The main HTML file for the application.
- `static/`: Contains static files like CSS, JavaScript, and images.
- `assets/`: Contains 3D models, fonts, and other assets used in the application.

## Configuration

- **Video Source**: The video source is set to `video.mp4` in `app.py`. Change this to `0` for the default camera or another video file.
- **Model Path**: Update the YOLO model path in `app.py` if necessary.

## Troubleshooting

- Ensure all dependencies are installed correctly.
- Check the console for any errors when running the application.
- Verify the paths to assets and models are correct.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Create a new Pull Request.

## Acknowledgments

- [Three.js](https://threejs.org/)
- [Flask](https://flask.palletsprojects.com/)
- [Ultralytics YOLO](https://github.com/ultralytics/yolov5)
- [WebXR](https://immersive-web.github.io/webxr/)

---

Feel free to modify the README to better fit your project's specifics, such as adding more detailed setup instructions or additional sections like FAQs or advanced configuration options.

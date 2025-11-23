
from ultralyticsplus import YOLO, render_result
import cv2
import pytesseract
import json

# load model
model = YOLO('foduucom/pan-card-detection')

# set model parameters
model.overrides['conf'] = 0.25  # NMS confidence threshold
model.overrides['iou'] = 0.45  # NMS IoU threshold
model.overrides['agnostic_nms'] = False  # NMS class-agnostic
model.overrides['max_det'] = 1000  # maximum number of detections per image

# set image
image = "C:\\Users\\BOSS1\\Downloads\\Screenshot 2025-11-22 205040.png"

# perform inference
results = model.predict(image)

img = cv2.imread(image)
data={}
labels = {0:"pan_number", 1:"name", 2:"father_name", 3:"dob"}
for i in range(4):
    x1, y1, x2, y2 = map(int, results[0].boxes[i].xyxy[0])
    if i==0:y1=y1+18
    else:y1=y1+10
    if i==3:
        pad = 12
        x1 = x1 - pad
        y1 = y1 - pad
        x2 = x2 + pad
        y2 = y2 + pad
    crop = img[y1:y2, x1:x2]
    text = pytesseract.image_to_string(crop).strip()

    data[labels[i]] = text   # store in dictionary
json_output = json.dumps(data, indent=4)
print(json_output)


# observe results
#print(results[0].boxes)
render = render_result(model=model, image=image, result=results[0])
render.show()

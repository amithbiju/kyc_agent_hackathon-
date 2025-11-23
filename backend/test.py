import requests
url = "http://127.0.0.1:5000/extract"
with open(r"C:\\Users\\BOSS1\\Downloads\\sample-aadhar.png","rb") as f:
    r = requests.post(url, files={"image": f})
print(r.status_code)
print(r.text)

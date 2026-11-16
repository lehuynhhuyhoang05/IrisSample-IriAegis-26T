# Model landmark dùng khi chuyển luồng nhóm 4 sang Web

`face_landmarker.task` được sao chép nguyên trạng từ `liveness_detection-main/models/face_landmarker.task`, nhánh `liveness-detection-server`, commit `38e09e8ed42178456876ef14fef3a14fc46a7b15` của nhóm 4.

SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.

Đây là model MediaPipe Face Landmarker dùng trong notebook nhóm 4 để cung cấp đầu vào landmark/biểu cảm trên Python. Web dùng cùng file với runtime MediaPipe Tasks Vision; đây không phải model anti-spoof hay model nhận dạng danh tính.

Nguồn: https://github.com/Long965/IrisSample-IriAegis-26T/tree/38e09e8ed42178456876ef14fef3a14fc46a7b15/liveness_detection-main/models

Tài liệu model và điều khoản sử dụng: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker

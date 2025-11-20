function goToStep(step) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById("step" + i).classList.add("hidden");
    document.getElementById("stepLabel" + i).classList.remove("active");
  }
  document.getElementById("step" + step).classList.remove("hidden");
  document.getElementById("stepLabel" + step).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function parseBloodPressure(text) {
  if (!text) return { sbp: NaN, dbp: NaN };
  const cleaned = text.replace(/\s+/g, "");
  const parts = cleaned.split("/");
  if (parts.length === 2) {
    return { sbp: parseInt(parts[0]), dbp: parseInt(parts[1]) };
  }
  return { sbp: parseInt(cleaned), dbp: NaN };
}

function calculateHEAR() {
  let H=0,E=0,A=0,R=0;
  const symptoms = document.querySelectorAll(".symptom:checked").length;
  if (symptoms <= 2) H = 0;
  else if (symptoms <= 4) H = 1;
  else H = 2;

  const ischemia = document.getElementById("ecgIschemia").value === "1";
  const other = document.getElementById("ecgOtherAbnormal").value === "1";
  if (!ischemia && !other) E = 0;
  else if (other && !ischemia) E = 1;
  else if (ischemia) E = 2;

  const age = parseInt(document.getElementById("patientAge").value);
  if (age < 45) A = 0;
  else if (age < 65) A = 1;
  else A = 2;

  const riskCount = document.querySelectorAll(".risk:checked").length;
  if (riskCount === 0) R = 0;
  else if (riskCount <= 2) R = 1;
  else R = 2;

  return { H,E,A,R,total:H+E+A+R };
}

const ecgFileInput = document.getElementById("ecgFile");
const ecgPreview = document.getElementById("ecgPreview");

ecgFileInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) {
    ecgPreview.innerHTML = "Chưa có ảnh ECG.";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    ecgPreview.innerHTML = "Ảnh ECG:";
    const img = document.createElement("img");
    img.src = e.target.result;
    ecgPreview.appendChild(img);
  };
  reader.readAsDataURL(file);

  await callBackendDemo(file);
});

async function callBackendDemo(file) {
  const statusBox = document.getElementById("ecgStatus");
  const summaryBox = document.getElementById("ecgTextSummary");

  statusBox.textContent = "AI đang phân tích ECG…";
  summaryBox.textContent = "Đang phân tích hình ảnh…";

  await new Promise(resolve => setTimeout(resolve, 1200));

  let ischemia=false, dangerousArr=false, otherAbn=false;

  const age = parseInt(document.getElementById("patientAge").value)||0;

  if (age>=65) { ischemia=true; otherAbn=true; }
  else if (age>=45) ischemia=true;
  else otherAbn=true;

  const name = file.name.toLowerCase();
  if (name.includes("vt") || name.includes("vf")) {
    dangerousArr=true;
    ischemia=false;
  }

  document.getElementById("ecgIschemia").value = ischemia?"1":"0";
  document.getElementById("ecgDangerousRhythm").value = dangerousArr?"1":"0";
  document.getElementById("ecgOtherAbnormal").value = otherAbn?"1":"0";

  let summary="";

  if (dangerousArr)
    summary="⚠️ ECG gợi ý rối loạn nhịp nguy hiểm.";
  else if (ischemia)
    summary="❗ Gợi ý thiếu máu cơ tim: biến đổi ST–T.";
  else if (otherAbn)
    summary="ℹ️ ECG có bất thường nhưng không đặc hiệu thiếu máu cơ tim.";
  else
    summary="✓ ECG chưa thấy dấu hiệu rõ.";

  statusBox.textContent = "Hoàn tất.";
  summaryBox.textContent = summary;
}

function calculateAndShowResult() {

  const bpText = document.getElementById("bp").value;
  const {sbp} = parseBloodPressure(bpText);

  const hr = parseInt(document.getElementById("hr").value);
  const rr = parseInt(document.getElementById("rr").value);
  const spo2 = parseInt(document.getElementById("spo2").value);
  const consciousness = document.getElementById("consciousness").value;

  let vitalsCritical=false;
  let vitalReasons=[];

  if (!isNaN(sbp)&&sbp<90){ vitalsCritical=true; vitalReasons.push("Huyết áp thấp"); }
  if (!isNaN(hr)&&(hr<40||hr>140)){ vitalsCritical=true; vitalReasons.push("Mạch bất thường"); }
  if (!isNaN(rr)&&rr>30){ vitalsCritical=true; vitalReasons.push("Nhịp thở nhanh"); }
  if (!isNaN(spo2)&&spo2<90){ vitalsCritical=true; vitalReasons.push("SpO₂ thấp"); }
  if (consciousness!=="tinh"){ vitalsCritical=true; vitalReasons.push("Tri giác giảm"); }

  const dangerousRhythm = document.getElementById("ecgDangerousRhythm").value==="1";
  const ischemia = document.getElementById("ecgIschemia").value==="1";
  const otherAbn = document.getElementById("ecgOtherAbnormal").value==="1";

  const symptomsCount = document.querySelectorAll(".symptom:checked").length;
  const riskCount = document.querySelectorAll(".risk:checked").length;

  let riskClass="",riskTitle="",riskSubtitle="",recommendations=[];
  let probability=0;

  if (vitalsCritical) {
    riskClass="risk-critical";
    riskTitle="🔴 ĐỎ – NGUY KỊCH";
    riskSubtitle="Dấu hiệu đe doạ tính mạng.";
    recommendations=[
      "Ưu tiên ABC.",
      "Ổn định huyết động.",
      "Chuyển tuyến khẩn.",
      "Theo dõi sát."
    ];
    probability=0.9;
  }

  else if (dangerousRhythm) {
    riskClass="risk-arrhythmia";
    riskTitle="🟠 CAM – RỐI LOẠN NHỊP NGUY HIỂM";
    riskSubtitle="ECG có rối loạn nhịp nguy hiểm.";
    recommendations=[
      "Xử trí rối loạn nhịp.",
      "Theo dõi liên tục.",
      "Hội chẩn tuyến trên.",
      "Chuyển tuyến cấp cứu."
    ];
    probability=0.85;
  }

  else {
    let fusion=0;
    if (ischemia) fusion+=4;
    fusion+=symptomsCount;
    fusion+=riskCount*0.5;

    probability=Math.min(1,fusion/11);

    if (probability<0.2){
      riskClass="risk-low";
      riskTitle="🟢 XANH – NGUY CƠ THẤP";
      riskSubtitle="Ít gợi ý thiếu máu cơ tim.";
      recommendations=[
        "Theo dõi tại cơ sở.",
        "Lặp ECG khi cần.",
        "Khám chuyên khoa khi thuận tiện.",
        "Dặn dò dấu hiệu nguy hiểm."
      ];
    } else {
      riskClass="risk-medium";
      riskTitle="🟡 VÀNG – NGUY CƠ TRUNG BÌNH/CAO";
      riskSubtitle="Có khả năng thiếu máu cơ tim.";
      recommendations=[
        "Theo dõi sát.",
        "Lặp ECG sau 10–15 phút.",
        "Hội chẩn tuyến trên.",
        "Cân nhắc chuyển tuyến."
      ];
    }
  }

  const probText = (probability*100).toFixed(0)+"%";

  document.getElementById("resultRiskCard").innerHTML=`
    <div class="risk-card ${riskClass}">
      <h2>${riskTitle}</h2>
      <p>${riskSubtitle}</p>
      <div class="pill">Xác suất thiếu máu cơ tim: <b>${probText}</b></div>
    </div>
  `;

  const recBox=document.getElementById("recommendationBox");
  recBox.className="recommend-box "+riskClass;
  recBox.innerHTML = `
    <h3>Khuyến cáo xử trí</h3>
    <ul>${recommendations.map(r=>`<li>${r}</li>`).join("")}</ul>
  `;

  const hear = calculateHEAR();
  const hearDiv=document.getElementById("hearSummary");
  hearDiv.innerHTML=`
    <h3>HEAR score</h3>
    <p><b>Tổng điểm: ${hear.total}/8</b></p>
    <p>History: ${hear.H} • ECG: ${hear.E} • Age: ${hear.A} • Risk: ${hear.R}</p>
    <p style="font-size:11px;color:#4b5563;margin-top:6px;">
      Chỉ tham khảo, không thay thế phân tầng 4 màu.
    </p>
  `;

  goToStep(4);
}

function resetForm() {
  // Xoá tất cả input, checkbox, select
  document.querySelectorAll("input,select").forEach(el => {
    if (el.type === "checkbox") {
      el.checked = false;
    } else if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else if (el.id !== "ecgIschemia" && el.id !== "ecgDangerousRhythm" && el.id !== "ecgOtherAbnormal") {
      // 3 hidden này sẽ set lại phía dưới
      el.value = "";
    }
  });

  // Reset các hidden ECG
  document.getElementById("ecgIschemia").value = "";
  document.getElementById("ecgDangerousRhythm").value = "";
  document.getElementById("ecgOtherAbnormal").value = "";

  // Reset hiển thị ECG
  document.getElementById("ecgPreview").innerHTML = "Chưa có ảnh ECG.";
  document.getElementById("ecgStatus").textContent = "Chưa phân tích.";
  document.getElementById("ecgTextSummary").textContent = "Chưa có kết luận.";

  // Xoá kết quả AI
  document.getElementById("resultRiskCard").innerHTML = "";
  const recBox = document.getElementById("recommendationBox");
  if (recBox) {
    recBox.className = "recommend-box";
    recBox.innerHTML = "";
  }
  const hearDiv = document.getElementById("hearSummary");
  if (hearDiv) {
    hearDiv.className = "hear-card";
    hearDiv.innerHTML = "";
  }

  // Quay lại bước 1
  goToStep(1);
}

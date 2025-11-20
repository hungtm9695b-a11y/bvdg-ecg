// Điều hướng bước
function goToStep(step) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById("step" + i).classList.add("hidden");
    document.getElementById("stepLabel" + i).classList.remove("active");
  }
  document.getElementById("step" + step).classList.remove("hidden");
  document.getElementById("stepLabel" + step).classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Tách huyết áp SBP/DBP
function parseBP(text) {
  if (!text) return { sbp: NaN, dbp: NaN };
  const cleaned = text.replace(/\s+/g, "");
  const parts = cleaned.split("/");
  if (parts.length === 2) {
    return { sbp: parseInt(parts[0]), dbp: parseInt(parts[1]) };
  }
  return { sbp: parseInt(cleaned), dbp: NaN };
}

// AI demo đọc ECG (giả lập)
async function callBackendDemo(file) {
  const statusBox = document.getElementById("ecgStatus");
  const summaryBox = document.getElementById("ecgTextSummary");

  statusBox.textContent = "AI đang phân tích ECG (demo)…";
  summaryBox.textContent = "Đang đọc ECG, vui lòng đợi…";

  await new Promise((resolve) => setTimeout(resolve, 1200));

  const age = parseInt(document.getElementById("patientAge").value) || 50;
  const rr = parseInt(document.getElementById("rr").value) || 18;
  const hr = parseInt(document.getElementById("hr").value) || 80;
  const bp = parseBP(document.getElementById("bp").value);
  const sbp = bp.sbp;

  let ischemia = false;
  let dangerousArr = false;

  if (file && file.name.toLowerCase().includes("stemi")) ischemia = true;
  if (file && file.name.toLowerCase().includes("af")) dangerousArr = true;

  if (sbp < 90 || hr > 150) dangerousArr = true;
  if (age > 70 && hr > 110) ischemia = true;

  document.getElementById("ecgIschemia").value = ischemia ? "1" : "0";
  document.getElementById("ecgDangerousRhythm").value = dangerousArr ? "1" : "0";
  document.getElementById("ecgOtherAbnormal").value = "0";

  let summary = `Nhịp ${hr} ck/ph. `;
  if (ischemia) summary += "Có dấu hiệu gợi ý thiếu máu cơ tim. ";
  if (dangerousArr) summary += "Gợi ý rối loạn nhịp nguy hiểm. ";
  if (!ischemia && !dangerousArr) summary += "Chưa thấy bất thường rõ ràng. ";

  statusBox.textContent = "Hoàn tất (demo).";
  summaryBox.textContent = summary;
}

// Upload ECG
const ecgFileInput = document.getElementById("ecgFile");
ecgFileInput.addEventListener("change", async function () {
  const file = this.files[0];
  const preview = document.getElementById("ecgPreview");

  if (!file) {
    preview.textContent = "Chưa có ảnh ECG.";
    return;
  }

  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  preview.innerHTML = "";
  preview.appendChild(img);

  await callBackendDemo(file);
});

// Tính HEAR score
function calculateHEAR() {
  let H = 0, E = 0, A = 0, R = 0;

  const symptomCount = document.querySelectorAll(".symptom:checked").length;
  if (symptomCount <= 2) H = 0;
  else if (symptomCount <= 4) H = 1;
  else H = 2;

  const ecgIschemia = document.getElementById("ecgIschemia").value === "1";
  E = ecgIschemia ? 2 : 0;

  const age = parseInt(document.getElementById("patientAge").value) || 0;
  if (age > 64) A = 2;
  else if (age >= 45) A = 1;

  const riskCount = document.querySelectorAll(".risk:checked").length;
  if (riskCount >= 3) R = 2;
  else if (riskCount >= 1) R = 1;

  return { H, E, A, R, total: H + E + A + R };
}

// Phân tích AI tổng hợp
function calculateAndShowResult() {
  const ischemia = document.getElementById("ecgIschemia").value === "1";
  const dangerousArr = document.getElementById("ecgDangerousRhythm").value === "1";

  const { H, E, A, R, total } = calculateHEAR();

  let riskLevel = "";
  let riskClass = "";
  let title = "";
  let recommendation = "";

  if (dangerousArr) {
    riskLevel = "Cam – Nguy cơ rối loạn nhịp";
    riskClass = "risk-arrhythmia";
    title = "Nguy cơ rối loạn nhịp nguy hiểm";
    recommendation = `
      • Theo dõi sát tại cơ sở.<br>
      • Xử trí theo phác đồ rối loạn nhịp.<br>
      • Chuyển tuyến khi có điều kiện.<br>
      • Cảnh giác dấu hiệu đe doạ tính mạng.`;
  } else if (ischemia) {
    riskLevel = "Đỏ – Nguy cơ thiếu máu cơ tim cao";
    riskClass = "risk-critical";
    title = "Nguy cơ thiếu máu cơ tim cao";
    recommendation = `
      • Chuyển viện cấp cứu ngay.<br>
      • Theo dõi sát dấu hiệu sinh tồn.<br>
      • Chuẩn bị xe chuyển tuyến và oxy.<br>
      • Liên hệ tuyến trên.`;
  } else if (total >= 3) {
    riskLevel = "Vàng – Nguy cơ trung bình";
    riskClass = "risk-medium";
    title = "Nguy cơ thiếu máu cơ tim trung bình";
    recommendation = `
      • Theo dõi tại cơ sở.<br>
      • Lặp ECG khi cần.<br>
      • Khám chuyên khoa khi thuận tiện.<br>
      • Dặn dò dấu hiệu nguy hiểm.`;
  } else {
    riskLevel = "Xanh – Nguy cơ thấp";
    riskClass = "risk-low";
    title = "Nguy cơ thiếu máu cơ tim thấp";
    recommendation = `
      • Theo dõi tại cơ sở.<br>
      • Lặp lại ECG nếu thay đổi triệu chứng.<br>
      • Tư vấn yếu tố nguy cơ tim mạch.`;
  }

  document.getElementById("resultRiskCard").innerHTML = `
    <div class="risk-card ${riskClass}">
      <h3>${title}</h3>
      <p>${riskLevel}</p>
    </div>
  `;

  const recBox = document.getElementById("recommendationBox");
  recBox.className = "recommend-box " + riskClass;
  recBox.innerHTML = `<h3>Khuyến cáo xử trí</h3><p>${recommendation}</p>`;

  const hearDiv = document.getElementById("hearSummary");
  hearDiv.className = "hear-card";
  hearDiv.innerHTML = `
    <h3>HEAR score ESC 2023</h3>
    <p><b>Tổng điểm: ${total}/8</b></p>
    History: ${H} • ECG: ${E} • Age: ${A} • Risk: ${R}
  `;

  goToStep(4);
}

// RESET HOÀN TOÀN → Quay về bước 1
function resetForm() {
  document.querySelectorAll("input,select").forEach(el => {
    if (el.type === "checkbox") {
      el.checked = false;
    } else if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else if (
      el.id !== "ecgIschemia" &&
      el.id !== "ecgDangerousRhythm" &&
      el.id !== "ecgOtherAbnormal"
    ) {
      el.value = "";
    }
  });

  document.getElementById("ecgIschemia").value = "";
  document.getElementById("ecgDangerousRhythm").value = "";
  document.getElementById("ecgOtherAbnormal").value = "";

  document.getElementById("ecgPreview").innerHTML = "Chưa có ảnh ECG.";
  document.getElementById("ecgStatus").textContent = "Chưa phân tích.";
  document.getElementById("ecgTextSummary").textContent = "Chưa có kết luận.";

  document.getElementById("resultRiskCard").innerHTML = "";

  const recBox = document.getElementById("recommendationBox");
  recBox.className = "recommend-box";
  recBox.innerHTML = "";

  const hearDiv = document.getElementById("hearSummary");
  hearDiv.className = "hear-card";
  hearDiv.innerHTML = "";

  goToStep(1);
}

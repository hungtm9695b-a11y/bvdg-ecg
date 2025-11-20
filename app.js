// ===== ĐIỀU HƯỚNG BƯỚC =====
function goToStep(step) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById("step" + i).classList.add("hidden");
    document.getElementById("stepLabel" + i).classList.remove("active");
  }
  document.getElementById("step" + step).classList.remove("hidden");
  document.getElementById("stepLabel" + step).classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== HÀM TÁCH HUYẾT ÁP SBP/DBP =====
function parseBP(text) {
  if (!text) return { sbp: NaN, dbp: NaN };
  const cleaned = text.replace(/\s+/g, "");
  const parts = cleaned.split("/");
  if (parts.length === 2) {
    return { sbp: parseInt(parts[0]), dbp: parseInt(parts[1]) };
  }
  return { sbp: parseInt(cleaned), dbp: NaN };
}

// ===== AI ECG THẬT: GỌI BACKEND FASTAPI TRÊN RENDER =====
async function callBackendReal(file) {
  const statusBox = document.getElementById("ecgStatus");
  const summaryBox = document.getElementById("ecgTextSummary");

  if (!file) {
    statusBox.textContent = "Chưa có file ECG.";
    summaryBox.textContent = "Vui lòng tải ảnh ECG.";
    return;
  }

  statusBox.textContent = "AI đang phân tích ECG (gọi backend)...";
  summaryBox.textContent = "Đang gửi ảnh lên máy chủ AI, vui lòng đợi...";

  try {
    const formData = new FormData();
    formData.append("file", file);

    // URL backend AI ECG của anh trên Render
    const response = await fetch(
      "https://ecg-ai-backend-9qip.onrender.com/api/ecg-analyze",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Backend trả lỗi: " + response.status);
    }

    const data = await response.json();

    const ischemia = !!data.ischemia;
    const dangerousArr = !!data.dangerous_arrhythmia;
    const summary =
      data.summary ||
      "AI đã phân tích ECG, nhưng chưa có mô tả chi tiết từ mô hình.";

    // Gán vào hidden input để các tầng AI khác dùng
    document.getElementById("ecgIschemia").value = ischemia ? "1" : "0";
    document.getElementById("ecgDangerousRhythm").value = dangerousArr
      ? "1"
      : "0";
    document.getElementById("ecgOtherAbnormal").value = "0";

    statusBox.textContent = "Đã phân tích xong bằng AI ECG backend.";
    summaryBox.textContent = summary;
  } catch (err) {
    console.error(err);
    statusBox.textContent = "Lỗi khi gọi AI backend.";
    summaryBox.textContent =
      "Không gửi được ảnh tới máy chủ AI. Vui lòng kiểm tra kết nối hoặc thử lại sau.";

    // fallback an toàn: không coi là thiếu máu / RLN
    document.getElementById("ecgIschemia").value = "0";
    document.getElementById("ecgDangerousRhythm").value = "0";
  }
}

// ===== XỬ LÝ UPLOAD ẢNH ECG =====
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

  // Gọi AI backend thật
  await callBackendReal(file);
});

// ===== TẦNG HEAR (FUSION AI) =====
function calculateHEAR() {
  let H = 0,
    E = 0,
    A = 0,
    R = 0;

  const symptomCount = document.querySelectorAll(".symptom:checked").length;
  // History
  if (symptomCount <= 2) H = 0;
  else if (symptomCount <= 4) H = 1;
  else H = 2;

  // ECG
  const ecgIschemia = document.getElementById("ecgIschemia").value === "1";
  E = ecgIschemia ? 2 : 0;

  // Age
  const age = parseInt(document.getElementById("patientAge").value) || 0;
  if (age > 64) A = 2;
  else if (age >= 45) A = 1;

  // Risk factors
  const riskCount = document.querySelectorAll(".risk:checked").length;
  if (riskCount >= 3) R = 2;
  else if (riskCount >= 1) R = 1;

  return { H, E, A, R, total: H + E + A + R };
}

// ===== TẦNG AI SINH TỒN (SAFETY LAYER) =====
function computeSafetyFlags() {
  const bp = parseBP(document.getElementById("bp").value);
  const sbp = bp.sbp;
  const hr = parseInt(document.getElementById("hr").value);
  const rr = parseInt(document.getElementById("rr").value);
  const spo2 = parseInt(document.getElementById("spo2").value);
  const consciousness = document.getElementById("consciousness").value;

  let critical = false;
  let reasons = [];

  // Tri giác xấu
  if (consciousness === "lom" || consciousness === "hon") {
    critical = true;
    reasons.push("Tri giác thay đổi");
  }

  // Huyết áp
  if (!isNaN(sbp) && sbp < 90) {
    critical = true;
    reasons.push("Tụt huyết áp");
  }

  // SpO2
  if (!isNaN(spo2) && spo2 < 92) {
    critical = true;
    reasons.push("SpO₂ giảm");
  }

  // Mạch
  if (!isNaN(hr) && (hr < 40 || hr > 130)) {
    critical = true;
    reasons.push("Nhịp tim bất thường");
  }

  // Nhịp thở
  if (!isNaN(rr) && (rr < 8 || rr > 30)) {
    critical = true;
    reasons.push("Nhịp thở bất thường");
  }

  return { critical, reasons };
}

// ===== TẦNG AI TRIỆU CHỨNG (SYMPTOM LAYER) =====
function computeSymptomLayer() {
  const checked = Array.from(document.querySelectorAll(".symptom:checked"));
  const count = checked.length;

  const typical = count >= 4; // điển hình
  const activated = count >= 3;

  return { activated, typical, count };
}

// ===== PHÂN TÍCH AI ĐA TẦNG =====
function calculateAndShowResult() {
  // 1. Tầng AI sinh tồn
  const safety = computeSafetyFlags();

  // 2. Tầng AI ECG
  const ischemia = document.getElementById("ecgIschemia").value === "1";
  const dangerousArr =
    document.getElementById("ecgDangerousRhythm").value === "1";

  // 3. Tầng AI triệu chứng
  const symptomLayer = computeSymptomLayer();

  // 4. Tầng HEAR (fusion)
  const { H, E, A, R, total } = calculateHEAR();

  let riskLevel = "";
  let riskClass = "";
  let title = "";
  let recommendation = "";
  let layers = [];

  if (safety.critical) layers.push("AI sinh tồn");
  if (dangerousArr) layers.push("AI rối loạn nhịp");
  if (ischemia) layers.push("AI thiếu máu cơ tim");
  if (symptomLayer.activated) layers.push("AI triệu chứng");
  layers.push("AI HEAR score");

  // Thứ tự ưu tiên:
  if (safety.critical) {
    riskLevel = "Đỏ – Đe doạ tính mạng";
    riskClass = "risk-critical";
    title = "Ưu tiên ABC – xử trí cấp cứu và chuyển viện ngay";

    const reasonText = safety.reasons.length
      ? "Dấu hiệu cảnh báo: " + safety.reasons.join(", ") + "."
      : "Có dấu hiệu suy tuần hoàn/hô hấp.";

    recommendation = `
      • Đánh giá và xử trí ABC ngay (đường thở – hô hấp – tuần hoàn).<br>
      • Gọi hỗ trợ cấp cứu nội viện hoặc 115 nếu cần.<br>
      • Chuẩn bị chuyển tuyến khẩn cấp tới cơ sở có can thiệp tim mạch/hồi sức.<br>
      • Theo dõi monitor liên tục, oxy, thiết lập đường truyền.<br>
      • ${reasonText}
    `;
  } else if (dangerousArr) {
    riskLevel = "Cam – Nguy cơ rối loạn nhịp nguy hiểm";
    riskClass = "risk-arrhythmia";
    title = "Nguy cơ rối loạn nhịp cần can thiệp";

    recommendation = `
      • Theo dõi sát tại cơ sở nếu điều kiện cho phép (monitor, oxy).<br>
      • Xử trí theo phác đồ rối loạn nhịp nhanh/chậm nếu đã được huấn luyện.<br>
      • Cân nhắc chuyển tuyến sớm đến đơn vị có điện tim liên tục và can thiệp chuyên sâu.<br>
      • Cảnh giác dấu hiệu tụt huyết áp, đau ngực, khó thở, suy tim.
    `;
  } else if (ischemia) {
    riskLevel = "Đỏ – Nguy cơ thiếu máu cơ tim cao";
    riskClass = "risk-critical";
    title = "Nguy cơ thiếu máu cơ tim/nhồi máu cơ tim cao";

    recommendation = `
      • Xử trí như hội chứng vành cấp nếu phù hợp lâm sàng.<br>
      • Chuyển viện cấp cứu ngay đến cơ sở có can thiệp mạch vành 24/7 nếu có thể.<br>
      • Theo dõi sinh tồn, chuẩn bị hồ sơ chuyển tuyến và gọi trước cho tuyến trên.<br>
      • Hạn chế trì hoãn tại tuyến cơ sở, không tự lái xe.
    `;
  } else if (total >= 3 || symptomLayer.activated) {
    riskLevel = "Vàng – Nguy cơ trung bình";
    riskClass = "risk-medium";
    title = "Nguy cơ thiếu máu cơ tim trung bình";

    recommendation = `
      • Theo dõi tại cơ sở, lặp lại ECG khi triệu chứng thay đổi hoặc sau 1–3 giờ nếu nghi ngờ.<br>
      • Cân nhắc gửi xét nghiệm men tim nếu khả thi.<br>
      • Tham vấn chuyên khoa tim mạch khi có điều kiện.<br>
      • Dặn dò bệnh nhân quay lại ngay nếu đau ngực tái phát hoặc nặng lên.
    `;
  } else {
    riskLevel = "Xanh – Nguy cơ thấp";
    riskClass = "risk-low";
    title = "Nguy cơ thiếu máu cơ tim thấp";

    recommendation = `
      • Có thể theo dõi ngoại trú tại cơ sở nếu lâm sàng ổn định.<br>
      • Tư vấn điều chỉnh yếu tố nguy cơ tim mạch (THA, ĐTĐ, hút thuốc...).<br>
      • Hẹn tái khám hoặc khám chuyên khoa nếu triệu chứng kéo dài.<br>
      • Dặn dò bệnh nhân khi có đau ngực dữ dội/khó thở phải đến ngay cơ sở y tế.
    `;
  }

  const layerNote = `
    <p style="font-size:12px;opacity:0.9;margin-top:4px;">
      Tầng AI kích hoạt: ${layers.join(" + ")}.
    </p>
  `;

  document.getElementById("resultRiskCard").innerHTML = `
    <div class="risk-card ${riskClass}">
      <h3>${title}</h3>
      <p>${riskLevel}</p>
      ${layerNote}
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

// ===== RESET TOÀN BỘ FORM =====
function resetForm() {
  document.querySelectorAll("input,select").forEach((el) => {
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

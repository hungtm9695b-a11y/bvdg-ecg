// ===== TIỆN ÍCH CHUNG =====
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// ===== BƯỚC 1: XỬ LÝ LÂM SÀNG VÀ SINH TỒN =====
function evaluateBradycardia(hr) {
  if (isNaN(hr)) return { risk: "low", reason: "Không có nhịp tim." };
  if (hr < 40)
    return {
      risk: "high",
      reason: "Nhịp tim < 40 ck/phút, có nguy cơ rối loạn huyết động.",
    };
  if (hr < 50)
    return {
      risk: "moderate",
      reason: "Nhịp tim chậm, cần theo dõi lâm sàng.",
    };
  return { risk: "low", reason: "" };
}

function evaluateTachycardia(hr) {
  if (isNaN(hr)) return { risk: "low", reason: "Không có nhịp tim." };
  if (hr > 150)
    return {
      risk: "high",
      reason: "Nhịp tim > 150 ck/phút, nguy cơ rối loạn huyết động.",
    };
  if (hr > 100)
    return {
      risk: "moderate",
      reason: "Nhịp tim nhanh, cần đánh giá nguyên nhân.",
    };
  return { risk: "low", reason: "" };
}

function evaluateBloodPressure(sys, dia) {
  if (isNaN(sys) || isNaN(dia))
    return { risk: "low", reason: "Chưa có huyết áp." };

  if (sys < 80 || dia < 50)
    return {
      risk: "high",
      reason: "Huyết áp tụt, có dấu hiệu sốc/giảm tưới máu.",
    };
  if (sys < 90 || dia < 60)
    return {
      risk: "moderate",
      reason: "Huyết áp thấp, cần theo dõi sát và tìm nguyên nhân.",
    };

  if (sys > 180 || dia > 110)
    return {
      risk: "moderate",
      reason:
        "Huyết áp quá cao, có thể liên quan tăng huyết áp nặng/cơn tăng huyết áp.",
    };

  return { risk: "low", reason: "" };
}

function evaluateRespiratoryRate(rr) {
  if (isNaN(rr)) return { risk: "low", reason: "Chưa có nhịp thở." };
  if (rr > 30 || rr < 8)
    return {
      risk: "high",
      reason: "Nhịp thở bất thường (quá nhanh hoặc quá chậm).",
    };
  if (rr > 20)
    return {
      risk: "moderate",
      reason: "Nhịp thở tăng, có thể do đau, lo âu hoặc suy hô hấp.",
    };
  return { risk: "low", reason: "" };
}

function evaluateOxygenSpO2(spo2) {
  if (isNaN(spo2)) return { risk: "low", reason: "Chưa đo SpO2." };
  if (spo2 < 90)
    return {
      risk: "high",
      reason: "SpO2 < 90%, nguy cơ suy hô hấp.",
    };
  if (spo2 < 94)
    return {
      risk: "moderate",
      reason: "SpO2 giảm, cần theo dõi và bổ sung oxy (nếu có chỉ định).",
    };
  return { risk: "low", reason: "" };
}

function evaluateConsciousness(level) {
  if (["glassgow_3", "glassgow_4_8"].includes(level))
    return {
      risk: "high",
      reason: "Rối loạn ý thức, nguy cơ suy hô hấp, tuần hoàn.",
    };
  if (level === "glassgow_9_14")
    return {
      risk: "moderate",
      reason: "Ý thức thay đổi, cần đánh giá nguyên nhân.",
    };
  return { risk: "low", reason: "" };
}

function computeVitalThreats() {
  const hr = parseInt(document.getElementById("heartRate").value);
  const sys = parseInt(document.getElementById("systolicBP").value);
  const dia = parseInt(document.getElementById("diastolicBP").value);
  const rr = parseInt(document.getElementById("respiratoryRate").value);
  const spo2 = parseInt(document.getElementById("spo2").value);
  const glasgow = document.getElementById("consciousness").value;

  let critical = false;
  const reasons = [];

  const brady = evaluateBradycardia(hr);
  const tachy = evaluateTachycardia(hr);
  const bp = evaluateBloodPressure(sys, dia);
  const resp = evaluateRespiratoryRate(rr);
  const ox = evaluateOxygenSpO2(spo2);
  const cns = evaluateConsciousness(glasgow);

  const factors = [brady, tachy, bp, resp, ox, cns];

  factors.forEach((f) => {
    if (f.risk === "high") {
      critical = true;
      if (f.reason) reasons.push(f.reason);
    } else if (f.risk === "moderate" && f.reason) {
      reasons.push(f.reason);
    }
  });

  return { critical, reasons };
}

document
  .getElementById("checkVitalButton")
  .addEventListener("click", function () {
    const resultDiv = document.getElementById("vitalResult");
    const { critical, reasons } = computeVitalThreats();

    if (critical) {
      resultDiv.innerHTML =
        "<span style='color:red; font-weight:bold;'>Có dấu hiệu sinh tồn đe dọa! " +
        "Ưu tiên cấp cứu, đánh giá và ổn định huyết động trước khi xử trí tiếp.</span><br/>" +
        reasons.join("<br/>");
    } else if (reasons.length > 0) {
      resultDiv.innerHTML =
        "<span style='color:orange; font-weight:bold;'>Sinh tồn có bất thường, cần theo dõi sát.</span><br/>" +
        reasons.join("<br/>");
    } else {
      resultDiv.innerHTML =
        "<span style='color:green; font-weight:bold;'>Chưa có dấu hiệu sinh tồn đe dọa.</span>";
    }
  });

// ===== BƯỚC 2: XỬ LÝ ECG (GỌI AI BACKEND) =====

// Xử lý preview ECG
const ecgUploadInput = document.getElementById("ecgUpload");
const ecgPreview = document.getElementById("ecgPreviewImage");
const ecgWarning = document.getElementById("ecgWarningText");

ecgUploadInput.addEventListener("change", function () {
  const file = ecgUploadInput.files[0];
  if (!file) {
    ecgPreview.style.display = "none";
    ecgWarning.textContent = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    ecgPreview.src = e.target.result;
    ecgPreview.style.display = "block";
  };
  reader.readAsDataURL(file);

  ecgWarning.textContent =
    "Ảnh chỉ dùng minh họa. Vui lòng đảm bảo che thông tin cá nhân bệnh nhân trước khi tải lên.";
});

// Hàm gọi backend AI thật (Render + OpenAI)
async function callBackendReal(file) {
  const statusBox = document.getElementById("ecgStatus");
  const summaryBox = document.getElementById("ecgTextSummary");

  // Backend AI ECG chạy trên Render, sử dụng OpenAI phía sau
  const BASE_URL = "https://ecg-ai-backend-1.onrender.com";

  if (!file) {
    statusBox.textContent = "Chưa có file ECG.";
    summaryBox.textContent = "Vui lòng tải ảnh ECG.";
    return;
  }

  statusBox.textContent = "AI đang phân tích ECG...";
  summaryBox.textContent =
    "Đang gửi ảnh lên máy chủ AI (OpenAI), vui lòng đợi...";

  try {
    const formData = new FormData();
    formData.append("file", file);

    // 1) Gọi nhẹ tới / để đánh thức backend (chống sleep)
    try {
      await fetch(BASE_URL + "/");
    } catch (wakeErr) {
      console.warn("Wake-up backend error (bỏ qua được):", wakeErr);
    }

    // 2) Hàm POST chính
    const doPost = async () => {
      const response = await fetch(BASE_URL + "/api/ecg-openai", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Backend trả lỗi HTTP " + response.status);
      }
      return response.json();
    };

    // 3) Gọi lần 1, nếu lỗi thì đợi 1.5s rồi thử lại lần 2
    let data;
    try {
      data = await doPost();
    } catch (err1) {
      console.warn("Lần 1 gọi AI thất bại, thử lại...", err1);
      await sleep(1500);
      data = await doPost();
    }

    // Chuẩn hoá dữ liệu trả về
    // Backend có thể trả trực tiếp { ischemia, dangerous_arrhythmia, summary, details }
    // hoặc bọc trong { ai_result: { ... } }
    const ai = data.ai_result || data || {};

    const ischemia =
      ai.ischemia === "likely" || ai.ischemia === "possible" ? true : false;
    const dangerousArr = !!ai.dangerous_arrhythmia;
    const summary =
      ai.summary ||
      "AI OpenAI đã phân tích ECG, nhưng chưa có mô tả chi tiết.";

    // Gán vào hidden input để tầng AI đa tầng sử dụng
    document.getElementById("ecgIschemia").value = ischemia ? "1" : "0";
    document.getElementById("ecgDangerousRhythm").value = dangerousArr
      ? "1"
      : "0";
    document.getElementById("ecgOtherAbnormal").value = "0";

    statusBox.textContent = "Đã phân tích xong bằng AI ECG (OpenAI).";
    summaryBox.textContent = summary;
  } catch (err) {
    console.error(err);
    statusBox.textContent = "Lỗi khi gọi AI backend.";
    summaryBox.textContent =
      "Không gửi được ảnh tới máy chủ AI. Vui lòng kiểm tra kết nối hoặc thử lại sau.";

    // fallback an toàn
    document.getElementById("ecgIschemia").value = "0";
    document.getElementById("ecgDangerousRhythm").value = "0";
  }
}

// Xử lý nút "Để AI phân tích ECG"
document
  .getElementById("btnAnalyzeECG")
  .addEventListener("click", async function () {
    const file = ecgUploadInput.files[0];
    await callBackendReal(file);
  });

// ===== TẦNG NHẬN DIỆN DẤU HIỆU ĐE DỌA TỬ VONG (CLINICAL RED FLAGS) =====
function checkRedFlags() {
  const chestPainYes = document.getElementById("chestPainYes").checked;
  const acuteOrWorsening =
    document.getElementById("symptomTimeAcute").checked ||
    document.getElementById("symptomTimeWorsening").checked;

  const redFlags = [];

  const vitals = computeVitalThreats();
  if (vitals.critical) redFlags.push("Sinh tồn đe dọa (sốc, suy hô hấp...).");

  const arrhythmiaDanger =
    document.getElementById("ecgDangerousRhythm").value === "1";
  if (arrhythmiaDanger)
    redFlags.push("ECG gợi ý rối loạn nhịp tim nguy hiểm.");

  const glasgow = document.getElementById("consciousness").value;
  if (["glassgow_3", "glassgow_4_8"].includes(glasgow))
    redFlags.push("Rối loạn ý thức nặng.");

  const isRed = chestPainYes && acuteOrWorsening && redFlags.length > 0;

  return {
    isRed,
    redFlags,
  };
}

// ===== TẦNG AI TRIỆU CHỨNG (SYMPTOM LAYER) =====
function computeSymptomLayer() {
  const checked = Array.from(document.querySelectorAll(".symptom:checked"));
  const count = checked.length;

  const typical = checked.some((el) => el.dataset.typical === "1");
  const verySuspicious = checked.some(
    (el) => el.dataset.verySuspicious === "1"
  );

  let symptomPattern = "non_suspicious";
  if (verySuspicious) symptomPattern = "very_suspicious";
  else if (typical) symptomPattern = "typical";

  let risk = "low";
  if (symptomPattern === "very_suspicious") risk = "very_high";
  else if (symptomPattern === "typical") risk = "high";
  else if (count >= 3) risk = "moderate";

  return {
    count,
    symptomPattern,
    risk,
  };
}

// ===== HEAR (FUSION AI) =====
function calculateHEAR() {
  let H = 0,
    E = 0,
    A = 0,
    R = 0;

  const symptomCount = Array.from(
    document.querySelectorAll(".symptom:checked")
  ).length;
  if (symptomCount <= 2) H = 0;
  else if (symptomCount <= 4) H = 1;
  else H = 2;

  const ecgIschemia = document.getElementById("ecgIschemia").value === "1";
  E = ecgIschemia ? 2 : 0;

  const age = parseInt(document.getElementById("patientAge").value) || 0;
  if (age > 64) A = 2;
  else if (age >= 45) A = 1;

  const dyspnea = document.querySelector(".symptomDyspnea");
  const palpitation = document.querySelector(".symptomPalpitation");
  const fatigue = document.querySelector(".symptomFatigue");

  if (
    (dyspnea && dyspnea.checked) ||
    (palpitation && palpitation.checked) ||
    (fatigue && fatigue.checked)
  ) {
    R = 1;
  }

  const total = H + E + A + R;
  let hearRisk = "low";

  if (total >= 5) hearRisk = "high";
  else if (total >= 3) hearRisk = "moderate";

  return {
    total,
    hearRisk,
    H,
    E,
    A,
    R,
  };
}

// ===== TỔNG HỢP TẦNG AI (AI FUSION) =====
function computeFinalRisk() {
  const { isRed, redFlags } = checkRedFlags();
  const symptom = computeSymptomLayer();
  const hear = calculateHEAR();

  const ecgIschemia = document.getElementById("ecgIschemia").value === "1";
  const ecgDangerousRhythm =
    document.getElementById("ecgDangerousRhythm").value === "1";

  let color = "green";
  let title = "Nguy cơ thấp";
  let detail = "Nguy cơ thiếu máu cơ tim hiện tại thấp.";

  if (isRed || ecgDangerousRhythm) {
    color = "red";
    title = "Nguy cơ rất cao / Cấp cứu ngay";
    detail =
      "Có dấu hiệu đe dọa tính mạng (sinh tồn/ECG). Cần gọi cấp cứu, hội chẩn và chuyển tuyến khẩn cấp nếu không xử trí được.";
  } else if (symptom.risk === "very_high") {
    color = "red";
    title = "Đau ngực rất nghi ngờ thiếu máu cơ tim";
    detail =
      "Triệu chứng rất điển hình cho thiếu máu cơ tim cấp. Cần chuyển cấp cứu, làm ECG liên tục và xét nghiệm men tim.";
  } else if (ecgIschemia && hear.hearRisk === "high") {
    color = "orange";
    title = "Nguy cơ cao";
    detail =
      "ECG có thay đổi thiếu máu cơ tim, kèm nhiều yếu tố nguy cơ. Nên hội chẩn chuyên khoa tim mạch và chuyển tuyến sớm.";
  } else if (hear.hearRisk === "moderate" || symptom.risk === "high") {
    color = "yellow";
    title = "Nguy cơ trung bình";
    detail =
      "Có triệu chứng nghi ngờ và/hoặc điểm HEAR trung bình. Nên theo dõi sát, làm thêm ECG lặp lại và xét nghiệm nếu có điều kiện.";
  } else {
    color = "green";
    title = "Nguy cơ thấp";
    detail =
      "Triệu chứng không điển hình, sinh tồn ổn định, HEAR thấp. Có thể theo dõi ngoại trú, dặn tái khám nếu triệu chứng tăng.";
  }

  return {
    color,
    title,
    detail,
    redFlags,
    symptom,
    hear,
  };
}

// ===== HIỂN THỊ KẾT QUẢ CUỐI =====
document
  .getElementById("btnComputeFinal")
  .addEventListener("click", function () {
    const result = computeFinalRisk();

    const card = document.getElementById("resultRiskCard");
    card.innerHTML = "";

    card.className = "risk-card " + result.color;

    const titleEl = document.createElement("h3");
    titleEl.textContent = result.title;

    const detailEl = document.createElement("p");
    detailEl.textContent = result.detail;

    card.appendChild(titleEl);
    card.appendChild(detailEl);

    if (result.redFlags && result.redFlags.length > 0) {
      const redList = document.createElement("ul");
      redList.style.marginTop = "8px";
      result.redFlags.forEach((rf) => {
        const li = document.createElement("li");
        li.textContent = rf;
        redList.appendChild(li);
      });
      card.appendChild(redList);
    }

    const hearDiv = document.getElementById("hearSummary");
    hearDiv.className = "hear-card";
    hearDiv.innerHTML = `
    <h4>HEAR score (demo)</h4>
    <p><strong>Tổng điểm:</strong> ${result.hear.total}</p>
    <p><strong>History (H):</strong> ${result.hear.H}</p>
    <p><strong>ECG (E):</strong> ${result.hear.E}</p>
    <p><strong>Age (A):</strong> ${result.hear.A}</p>
    <p><strong>Risk factors (R):</strong> ${result.hear.R}</p>
    <p><strong>Nguy cơ HEAR:</strong> ${result.hear.hearRisk}</p>
  `;

    const recBox = document.getElementById("recommendationBox");
    recBox.className = "recommend-box";

    let recText = "";
    if (result.color === "red") {
      recText =
        "Khuyến cáo: Chuyển cấp cứu/hồi sức ngay. Ưu tiên ABC, gọi hỗ trợ, hội chẩn tim mạch.";
    } else if (result.color === "orange") {
      recText =
        "Khuyến cáo: Chuyển tuyến sớm hoặc hội chẩn chuyên khoa tim mạch. Cân nhắc làm thêm xét nghiệm men tim, siêu âm tim.";
    } else if (result.color === "yellow") {
      recText =
        "Khuyến cáo: Theo dõi sát tại cơ sở, làm ECG lặp lại, theo dõi triệu chứng và các yếu tố nguy cơ.";
    } else {
      recText =
        "Khuyến cáo: Có thể quản lý ngoại trú, tư vấn thay đổi lối sống, dặn tái khám nếu triệu chứng thay đổi.";
    }

    recBox.textContent = recText;

    goToStep(4);
  });

// ===== NÚT TẠO CA MỚI =====
document.getElementById("btnNewCase").addEventListener("click", function () {
  document.getElementById("patientAge").value = "";
  document.getElementById("patientSex").value = "male";
  document.getElementById("heartRate").value = "";
  document.getElementById("systolicBP").value = "";
  document.getElementById("diastolicBP").value = "";
  document.getElementById("respiratoryRate").value = "";
  document.getElementById("spo2").value = "";
  document.getElementById("consciousness").value = "glassgow_15";

  document
    .querySelectorAll('input[name="chestPainLocation"]')
    .forEach((el) => (el.checked = false));
  document
    .querySelectorAll('input[name="symptomTime"]')
    .forEach((el) => (el.checked = false));

  document.querySelectorAll(".symptom").forEach((el) => (el.checked = false));

  ecgUploadInput.value = "";
  ecgPreview.style.display = "none";
  ecgWarning.textContent = "";
  document.getElementById("ecgStatus").textContent =
    "Chưa có ảnh ECG được phân tích.";
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

// ===== TIỆN ÍCH CHUNG =====
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== ĐIỀU HƯỚNG BƯỚC =====
function goToStep(step) {
  for (let i = 1; i <= 4; i++) {
    const panel = document.getElementById("step" + i);
    const label = document.getElementById("stepLabel" + i);
    if (panel) panel.classList.add("hidden");
    if (label) label.classList.remove("active");
  }
  const currentPanel = document.getElementById("step" + step);
  const currentLabel = document.getElementById("stepLabel" + step);
  if (currentPanel) currentPanel.classList.remove("hidden");
  if (currentLabel) currentLabel.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== TẦNG AI AN TOÀN (SINH TỒN) =====
function computeSafetyFlags() {
  const sbpText = document.getElementById("sbp")?.value.trim() || "";
  const dbpText = document.getElementById("dbp")?.value.trim() || "";
  let sbp = NaN,
    dbp = NaN;

  if (sbpText.includes("/")) {
    const parts = sbpText.split("/");
    if (parts.length === 2) {
      sbp = parseInt(parts[0], 10);
      dbp = parseInt(parts[1], 10);
    }
  } else {
    sbp = parseInt(sbpText || "0", 10);
    dbp = parseInt(dbpText || "0", 10);
  }

  const hr = parseInt(document.getElementById("hr")?.value || "0", 10);
  const spo2 = parseInt(document.getElementById("spo2")?.value || "0", 10);
  const mental = document.getElementById("mentalStatus")?.value || "0";
  const shockSign = document.getElementById("shockSign")?.checked || false;

  let unstable = false;

  if (!isNaN(sbp) && sbp < 90) unstable = true;
  if (!isNaN(hr) && (hr < 40 || hr > 130)) unstable = true;
  if (!isNaN(spo2) && spo2 < 90) unstable = true;
  if (mental === "2") unstable = true;
  if (shockSign) unstable = true;

  return { unstable };
}

// ===== TẦNG AI TRIỆU CHỨNG =====
function computeSymptomLayer() {
  const typicalChestPain =
    (document.getElementById("symChestExertion")?.checked || false) &&
    (document.getElementById("symChestPressure")?.checked || false) &&
    (document.getElementById("symRelievedByRest")?.checked || false);

  const hasShortness =
    (document.getElementById("symDyspnea")?.checked || false) ||
    (document.getElementById("symOrthopnea")?.checked || false);

  const chestPainDuration =
    document.getElementById("symChestDuration")?.value || "0";

  const riskFactors = [
    "rfHypertension",
    "rfDiabetes",
    "rfSmoking",
    "rfDyslipid",
    "rfCadHistory",
  ];
  const riskCount = riskFactors.filter(
    (id) => document.getElementById(id)?.checked
  ).length;

  let layer = "low";

  if (typicalChestPain && chestPainDuration === "2") {
    layer = "high";
  } else if (typicalChestPain || hasShortness || riskCount >= 2) {
    layer = "intermediate";
  } else {
    layer = "low";
  }

  return { layer, riskCount, typicalChestPain, hasShortness };
}

// ===== PREVIEW ẢNH ECG =====
function initImagePreview() {
  const fileInput = document.getElementById("ecgFile");
  const preview = document.getElementById("ecgPreview");

  if (!fileInput || !preview) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) {
      preview.textContent = "Chưa có ảnh ECG.";
      return;
    }

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "100%";
    img.style.display = "block";
    preview.innerHTML = "";
    preview.appendChild(img);

    await callBackendReal(file);
  });
}

// ===== GỌI BACKEND AI THẬT (OPENAI QUA BACKEND CỦA BÁC SĨ) =====
async function callBackendReal(file) {
  const statusBox = document.getElementById("ecgStatus");
  const summaryBox = document.getElementById("ecgTextSummary");

  const BASE_URL = "https://ecg-ai-backend-1.onrender.com";

  if (!file) {
    if (statusBox) statusBox.textContent = "Chưa có file ECG.";
    if (summaryBox) summaryBox.textContent = "Vui lòng tải ảnh ECG.";
    return;
  }

  if (statusBox) statusBox.textContent = "AI đang phân tích ECG...";
  if (summaryBox)
    summaryBox.textContent =
      "Đang gửi ảnh lên máy chủ AI, vui lòng đợi trong giây lát...";

  try {
    const formData = new FormData();
    formData.append("file", file);

    // Đánh thức Render
    try {
      await fetch(BASE_URL + "/");
    } catch (wakeErr) {
      console.warn("Wake-up backend error (bỏ qua được):", wakeErr);
    }

    const doPost = async () => {
      const response = await fetch(BASE_URL + "/api/ecg-openai", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    };

    let data;
    try {
      data = await doPost();
    } catch (err1) {
      console.warn("Lần 1 gọi AI thất bại, thử lại:", err1);
      await sleep(1500);
      data = await doPost();
    }

    // Chuẩn hoá dữ liệu trả về
    let ischemia = !!data.ischemia;
    let dangerousArr = !!(
      data.dangerous_arrhythmia ||
      data.dangerous_arr ||
      data.dangerous_rhythm
    );
    let summary =
      data.summary ||
      data.text_summary ||
      (data.ai_result && data.ai_result.summary) ||
      "AI đã phân tích ECG, nhưng chưa có mô tả chi tiết.";

    if (data.ai_result) {
      const ai = data.ai_result;
      if (typeof ai.ischemia !== "undefined") ischemia = !!ai.ischemia;
      if (typeof ai.dangerous_arrhythmia !== "undefined")
        dangerousArr = !!ai.dangerous_arrhythmia;
      else if (typeof ai.dangerous_arr !== "undefined")
        dangerousArr = !!ai.dangerous_arr;
      if (ai.summary) summary = ai.summary;
    }

    const ischemiaInput = document.getElementById("ecgIschemia");
    const dangArrInput = document.getElementById("ecgDangerousRhythm");
    const otherAbnInput = document.getElementById("ecgOtherAbnormal");

    if (ischemiaInput) ischemiaInput.value = ischemia ? "1" : "0";
    if (dangArrInput) dangArrInput.value = dangerousArr ? "1" : "0";
    if (otherAbnInput) otherAbnInput.value = "0";

    if (statusBox)
      statusBox.textContent = "Đã phân tích xong bằng AI ECG backend.";
    if (summaryBox) summaryBox.textContent = summary;
  } catch (error) {
    console.error("Lỗi khi gọi AI backend:", error);
    if (statusBox) statusBox.textContent = "Lỗi khi gọi AI backend.";
    if (summaryBox)
      summaryBox.textContent =
        "Không gửi được ảnh tới máy chủ AI. Vui lòng kiểm tra kết nối hoặc thử lại sau.";

    const ischemiaInput = document.getElementById("ecgIschemia");
    const dangArrInput = document.getElementById("ecgDangerousRhythm");
    const otherAbnInput = document.getElementById("ecgOtherAbnormal");
    if (ischemiaInput) ischemiaInput.value = "0";
    if (dangArrInput) dangArrInput.value = "0";
    if (otherAbnInput) otherAbnInput.value = "0";
  }
}

// ===== TẦNG HEAR (FUSION AI) =====
function calculateHEAR() {
  let H = 0,
    E = 0,
    A = 0,
    R = 0;

  const symptomCount =
    document.querySelectorAll(".symptom:checked").length || 0;
  if (symptomCount <= 2) H = 0;
  else if (symptomCount <= 4) H = 1;
  else H = 2;

  const ecgIschemia =
    document.getElementById("ecgIschemia")?.value === "1" || false;
  E = ecgIschemia ? 2 : 0;

  const age = parseInt(document.getElementById("age")?.value || "0", 10);
  if (age < 45) A = 0;
  else if (age <= 64) A = 1;
  else A = 2;

  const riskFactors = [
    "rfHypertension",
    "rfDiabetes",
    "rfSmoking",
    "rfDyslipid",
    "rfCadHistory",
  ];
  const riskCount = riskFactors.filter(
    (id) => document.getElementById(id)?.checked
  ).length;

  if (riskCount === 0) R = 0;
  else if (riskCount === 1 || riskCount === 2) R = 1;
  else R = 2;

  const total = H + E + A + R;
  return { H, E, A, R, total };
}

// ===== PHÂN TÍCH AI ĐA TẦNG & HIỂN THỊ =====
function calculateAndShowResult() {
  const safety = computeSafetyFlags();

  const ischemia =
    document.getElementById("ecgIschemia")?.value === "1" || false;
  const dangerousArr =
    document.getElementById("ecgDangerousRhythm")?.value === "1" || false;

  const symptomLayer = computeSymptomLayer();
  const { H, E, A, R, total } = calculateHEAR();

  let riskClass = "risk-low";
  let title = "XANH – NGUY CƠ THIẾU MÁU CƠ TIM THẤP";
  let riskLevel =
    "Hiện ít gợi ý thiếu máu cơ tim cấp, có thể theo dõi tại tuyến cơ sở.";
  const layers = [];

  if (safety.unstable) layers.push("AI Safety");
  if (ischemia || dangerousArr) layers.push("AI ECG");
  if (symptomLayer.layer === "high") layers.push("AI Triệu chứng");
  if (total >= 4) layers.push("HEAR");

  if (
    safety.unstable ||
    ischemia ||
    dangerousArr ||
    symptomLayer.layer === "high" ||
    total >= 4
  ) {
    riskClass = "risk-high";
    title = "ĐỎ – NGUY CƠ THIẾU MÁU CƠ TIM CAO / KHÔNG ỔN ĐỊNH";
    riskLevel =
      "Cần chuyển tuyến gấp hoặc hội chẩn chuyên khoa tim mạch. Luôn ưu tiên xử trí cấp cứu trước khi vận chuyển.";
  } else if (
    symptomLayer.layer === "intermediate" ||
    (total >= 2 && total <= 3)
  ) {
    riskClass = "risk-intermediate";
    title = "VÀNG – NGUY CƠ THIẾU MÁU CƠ TIM TRUNG BÌNH";
    riskLevel =
      "Cần làm thêm xét nghiệm, theo dõi sát hoặc hội chẩn, tuỳ điều kiện cơ sở.";
  } else {
    riskClass = "risk-low";
    title = "XANH – NGUY CƠ THIẾU MÁU CƠ TIM THẤP";
    riskLevel =
      "Có thể theo dõi tại tuyến cơ sở, hẹn tái khám hoặc chuyển tuyến khi triệu chứng thay đổi.";
  }

  const recommendation = buildRecommendationText(
    safety,
    ischemia,
    dangerousArr,
    symptomLayer,
    total
  );

  const riskCard = document.getElementById("resultRiskCard");
  if (riskCard)
    riskCard.innerHTML = `
      <div class="risk-card ${riskClass}">
        <h3>${title}</h3>
        <p>${riskLevel}</p>
      </div>
    `;

  const recBox = document.getElementById("recommendationBox");
  if (recBox) {
    recBox.className = "recommend-box " + riskClass;
    recBox.innerHTML = recommendation;
  }

  const hearDiv = document.getElementById("hearSummary");
  if (hearDiv) {
    hearDiv.className = "hear-card";
    hearDiv.innerHTML = `
      <h4>HEAR score (tham khảo)</h4>
      <p>Tổng điểm: ${total} / 8</p>
      <p>History: ${H} • ECG: ${E} • Age: ${A} • Risk: ${R}</p>
      <p>HEAR score chỉ mang tính tham khảo, không thay thế phân tầng 4 màu của AI.</p>
    `;
  }

  goToStep(4);
}

// ===== KHUYẾN CÁO CHỮ =====
function buildRecommendationText(
  safety,
  ischemia,
  dangerousArr,
  symptomLayer,
  hearTotal
) {
  let text = "";

  if (safety.unstable) {
    text +=
      "<p><strong>1. Tầng AI Safety:</strong> Sinh tồn không ổn định. Cần xử trí cấp cứu ngay (ABC, oxy, truyền dịch, thuốc vận mạch nếu cần) và chuyển tuyến khẩn cấp.</p>";
  } else {
    text +=
      "<p><strong>1. Tầng AI Safety:</strong> Chưa ghi nhận suy hô hấp/sốc rõ. Tiếp tục theo dõi sinh tồn.</p>";
  }

  if (ischemia || dangerousArr) {
    text +=
      "<p><strong>2. Tầng AI ECG:</strong> Có gợi ý thiếu máu cơ tim cấp hoặc rối loạn nhịp nguy hiểm. Cần hội chẩn tim mạch, xem xét chuyển tuyến hoặc can thiệp sớm.</p>";
  } else {
    text +=
      "<p><strong>2. Tầng AI ECG:</strong> Chưa thấy thiếu máu cơ tim cấp/rối loạn nhịp nguy hiểm rõ trên ECG tải lên. Tuy nhiên vẫn cần kết hợp lâm sàng.</p>";
  }

  if (symptomLayer.layer === "high") {
    text +=
      "<p><strong>3. Tầng AI Triệu chứng:</strong> Triệu chứng điển hình, kéo dài, kèm yếu tố nguy cơ nhiều. Nên nhập viện hoặc chuyển tuyến để loại trừ hội chứng vành cấp.</p>";
  } else if (symptomLayer.layer === "intermediate") {
    text +=
      "<p><strong>3. Tầng AI Triệu chứng:</strong> Triệu chứng chưa hoàn toàn điển hình, nhưng vẫn có dấu hiệu nghi ngờ. Cần theo dõi sát, làm thêm cận lâm sàng nếu có thể.</p>";
  } else {
    text +=
      "<p><strong>3. Tầng AI Triệu chứng:</strong> Triệu chứng nhẹ, không điển hình, ít yếu tố nguy cơ. Có thể theo dõi ngoại trú và hẹn tái khám.</p>";
  }

  if (hearTotal >= 4) {
    text +=
      "<p><strong>4. Tầng HEAR:</strong> Điểm HEAR từ 4 trở lên gợi ý nguy cơ trung bình/cao. Nên làm thêm men tim, theo dõi ECG seri hoặc chuyển tuyến.</p>";
  } else {
    text +=
      "<p><strong>4. Tầng HEAR:</strong> Điểm HEAR dưới 4, nguy cơ thấp đến trung bình. Có thể theo dõi tại chỗ nếu các tầng AI khác cũng nguy cơ thấp.</p>";
  }

  text +=
    "<p><em>Lưu ý:</em> Đây là công cụ hỗ trợ, không thay thế quyết định lâm sàng của bác sĩ. Luôn ưu tiên đánh giá tại giường bệnh và các hướng dẫn chuyên ngành hiện hành.</p>";

  return text;
}

// ===== RESET FORM =====
function resetForm() {
  const form = document.getElementById("triageForm");
  if (form) form.reset();

  const preview = document.getElementById("ecgPreview");
  const statusBox = document.getElementById("ecgStatus");
  const summaryBox = document.getElementById("ecgTextSummary");
  const riskCard = document.getElementById("resultRiskCard");
  const recBox = document.getElementById("recommendationBox");
  const hearDiv = document.getElementById("hearSummary");

  if (preview) preview.innerHTML = "Chưa có ảnh ECG.";
  if (statusBox) statusBox.textContent = "Chưa phân tích.";
  if (summaryBox) summaryBox.textContent = "Chưa có kết luận.";
  if (riskCard) riskCard.innerHTML = "";
  if (recBox) {
    recBox.className = "recommend-box";
    recBox.innerHTML = "";
  }
  if (hearDiv) {
    hearDiv.className = "hear-card";
    hearDiv.innerHTML = "";
  }

  goToStep(1);
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  initImagePreview();

  const btnToStep2 = document.getElementById("btnToStep2");
  const btnToStep3 = document.getElementById("btnToStep3");
  const btnAnalyzeAI = document.getElementById("btnAnalyzeAI");
  const btnNewCase = document.getElementById("btnNewCase");

  if (btnToStep2)
    btnToStep2.addEventListener("click", () => {
      goToStep(2);
    });

  if (btnToStep3)
    btnToStep3.addEventListener("click", () => {
      goToStep(3);
    });

  if (btnAnalyzeAI)
    btnAnalyzeAI.addEventListener("click", () => {
      calculateAndShowResult();
    });

  if (btnNewCase)
    btnNewCase.addEventListener("click", () => {
      resetForm();
    });
});

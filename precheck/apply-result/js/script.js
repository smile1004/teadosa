
(function(){
  const params = new URLSearchParams(window.location.search);
  const pick = (...keys) => {
    for (const key of keys) {
      const value = params.get(key);
      if (value && value.trim()) return value.trim();
    }
    return "";
  };
  const values = {
    resultName: pick("name","applicantName"),
    resultPhone: pick("phone","tel","mobile"),
    resultAddress: pick("address","siteAddress"),
    resultType: pick("type","siteType"),
    resultPurpose: pick("purpose") || "발전사업",
    resultMessage: pick("message","request","memo") || "입력 내용 없음"
  };
  let received = false;
  Object.entries(values).forEach(([id,value])=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value || "-";
    if (value && value !== "입력 내용 없음" && value !== "발전사업") received = true;
  });
  const notice = document.getElementById("emptyNotice");
  if (notice && !received) notice.style.display = "block";
})();

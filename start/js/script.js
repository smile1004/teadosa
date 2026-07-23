document.querySelectorAll('a[href="#"]').forEach(function(link){
  link.addEventListener("click", function(e){
    e.preventDefault();
    alert("상세 신청 페이지 연결 전 시안입니다.");
  });
});

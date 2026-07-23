
document.addEventListener('click', function(event){
  const link = event.target.closest('a');
  if(!link) return;

  if(link.classList.contains('sample-link')) return;

  if(link.classList.contains('placeholder-link')){
    event.preventDefault();
    event.stopPropagation();
    alert(link.dataset.message || '상세 페이지 준비 중입니다.');
    return;
  }

  if(link.getAttribute('href') === '#'){
    event.preventDefault();
  }
});

function openStructureSample(event){
  if(event){
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  const width = 620;
  const height = 900;
  const left = Math.max(0, (screen.availWidth - width) / 2);
  const top = Math.max(0, (screen.availHeight - height) / 2);

  const popup = window.open(
    'precheck/samples/structure-review/index.html',
    'structureSample',
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if(!popup){
    window.location.href = 'precheck/samples/structure-review/index.html';
  }
  return false;
}

function openFieldInspectionSample(event){
  if(event){
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  const width = 620;
  const height = 900;
  const left = Math.max(0, (screen.availWidth - width) / 2);
  const top = Math.max(0, (screen.availHeight - height) / 2);

  const popup = window.open(
    'precheck/samples/field-inspection/index.html',
    'fieldInspectionSample',
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if(!popup){
    window.location.href = 'precheck/samples/field-inspection/index.html';
  }
  return false;
}


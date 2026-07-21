const form = document.getElementById('preCheckForm');
    const resultBox = document.getElementById('resultBox');

    const getRadioValue = (name) => {
      const selected = document.querySelector(`input[name="${name}"]:checked`);
      return selected ? selected.value : '';
    };

    form.addEventListener('submit', function(e){
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();
      const siteType = getRadioValue('siteType');
      const purpose = getRadioValue('purpose');
      const memo = document.getElementById('memo').value.trim();

      document.getElementById('resultName').textContent = name;
      document.getElementById('resultPhone').textContent = phone;
      document.getElementById('resultAddress').textContent = address;
      document.getElementById('resultSiteType').textContent = siteType;
      document.getElementById('resultPurpose').textContent = purpose;
      document.getElementById('resultMemo').textContent = memo || '입력 내용 없음';

      resultBox.classList.add('show');
      resultBox.scrollIntoView({ behavior:'smooth', block:'start' });
    });

    form.addEventListener('reset', function(){
      resultBox.classList.remove('show');
    });

    function checkResult(){
      window.location.href = 'precheck-result.html';
    }

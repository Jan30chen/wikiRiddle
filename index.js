// ==UserScript==
// @name         班固米猜简介
// @author       jan30chen
// @match        https://chii.in/magi
// @match        https://bgm.tv/magi
// @match        https://bangumi.tv/magi
// ==/UserScript==
(function () {
  function beginGame () {
    const urlParams = new URLSearchParams(window.location.search);
    // 存储原始 summary
    let originalSummary = '';
    let originalCleanedName = '';
    let currentEncryptedSummary = '';
    let currentEncryptedName = '';
    let guessedCharacters = new Set();
    let currentId = urlParams.get('subject');
    let currentDate = new Date();
    let currentTitle = currentId ? `自定义谜题` : `${currentDate.getMonth() + 1}月${currentDate.getDate()}日` + "的谜题";

    // 清除之前的内容
    const columnAppA = document.getElementById('columnAppA');
    const columnAppB = document.getElementById('columnAppB');
    const puzzlesDiv = document.createElement('div');
    puzzlesDiv.id = 'puzzlesContainer';

    columnAppA.innerHTML = '';
    columnAppB.innerHTML = '';

    if (currentId) {
      fetchData2();
    } else {
      fetchData(currentDate.getDate());
    }
    buildPanel();

    // 获取数据
    async function fetchData (day) {
      // 清空之前的内容
      puzzlesDiv.innerHTML = '<p>加载谜题中……</p>';
      columnAppB.innerHTML = '';
      try {
        // 基础方式 - 手动拼接
        const indexId = urlParams.get('index') || 85782;
        const params = {
          type: 2,
          limit: 31,
          offset: 0
        };
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`https://api.bgm.tv/v0/indices/${indexId}/subjects?${queryString}`)
        const data = await response.json();
        const list = data.data.map(item => item.id);
        currentId = list[day - 1];
        fetchData2()
      } catch (error) {
        puzzlesDiv.innerHTML = '<p>加载谜题列表失败</p>';
        console.error('请求失败:', error);
      }
    }
    async function fetchData2 () {
      // 清空之前的内容
      puzzlesDiv.innerHTML = '<p>加载谜题中……</p>';
      columnAppB.innerHTML = '';
      try {
        const response = await fetch(`https://api.bgm.tv/v0/subjects/${currentId}`)
        const info = await response.json();
        buildPuzzles(info);
      } catch (error) {
        puzzlesDiv.innerHTML = '<p>加载谜题失败</p>';
        console.error('请求失败:', error);
      }
    }
    // 构建面板
    function buildPanel () {
      // 选择日期的标题组件
      const pad = (n) => n.toString().padStart(2, '0');
      const yyyy = currentDate.getFullYear();
      const mm = pad(currentDate.getMonth() + 1);
      const dd = pad(currentDate.getDate());

      const headerContainer = document.createElement('div');
      headerContainer.style.display = 'flex';
      headerContainer.style.justifyContent = 'space-between';
      headerContainer.style.alignItems = 'center';
      headerContainer.style.marginTop = '8px';
      headerContainer.style.marginBottom = '8px';

      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.value = `${yyyy}-${mm}-${dd}`;
      // 禁止手动键入和粘贴，只允许通过点击日期选择器选择日期
      dateInput.addEventListener('keydown', function (e) { e.preventDefault(); });
      dateInput.addEventListener('paste', function (e) { e.preventDefault(); });
      // 将最大可选日期设置为今天，防止选择未来的日期
      dateInput.max = `${yyyy}-${mm}-${dd}`;
      dateInput.min = `${yyyy}-${mm}-01`;
      dateInput.style.padding = '4px 6px';

      const headerTitle = document.createElement('span');
      const formatHeader = (date) => `${date.getMonth() + 1}月${date.getDate()}日的谜题：`;
      headerTitle.textContent = currentTitle
      headerTitle.style.color = '#f09199';
      headerTitle.style.borderBottom = '2px solid #f09199';
      headerTitle.style.fontSize = '16px';
      headerTitle.style.fontWeight = '600';

      // 当用户选择日期时更新标题显示
      dateInput.addEventListener('change', function () {
        if (!this.value) return;
        const parts = this.value.split('-');
        currentDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        headerTitle.textContent = formatHeader(currentDate);
        fetchData(currentDate.getDate());
      });
      headerContainer.appendChild(headerTitle);
      urlParams.get('subject') || headerContainer.appendChild(dateInput);
      columnAppA.appendChild(headerContainer);
    }
    // 构建谜题面板
    function buildPuzzles (info) {
      const {
        name_cn,
        summary
      } = info;
      /* ---columnAppA start--- */
      // 将处理后的标题和简介放到 columnAppA 容器中
      const titleDiv = document.createElement('div');
      titleDiv.style.fontSize = '20px';
      titleDiv.style.fontWeight = 'bold';
      titleDiv.style.margin = '10px 0';
      titleDiv.style.color = '#333';
      // name_cn 先移除所有标点和空格，再加密
      const cleanedName = name_cn.replace(/[\p{P}\s]/gu, '');
      titleDiv.textContent = encryptedText(name_cn.replace(/[\p{P}\s]/gu, ''));

      const summaryDiv = document.createElement('div');
      summaryDiv.style.fontSize = '14px';
      summaryDiv.style.lineHeight = '1.6';
      summaryDiv.style.color = '#666';

      // 保存原始值和加密后的内容
      originalSummary = summary;
      originalCleanedName = cleanedName;
      currentEncryptedSummary = encryptedText(summary);
      currentEncryptedName = encryptedText(cleanedName);
      guessedCharacters.clear();

      // summaryDiv 初始显示加密后的内容
      summaryDiv.textContent = currentEncryptedSummary;

      puzzlesDiv.innerHTML = '';
      puzzlesDiv.appendChild(titleDiv);
      puzzlesDiv.appendChild(summaryDiv);
      columnAppA.appendChild(puzzlesDiv);
      /* ---columnAppA end--- */

      /* ---columnAppB start:添加输入框和显示区域--- */
      const inputContainer = document.createElement('div');
      inputContainer.style.marginTop = '20px';

      const inputLabel = document.createElement('label');
      inputLabel.textContent = '简介中可能会包含什么字？';
      inputLabel.style.display = 'block';
      inputLabel.style.marginBottom = '8px';
      inputLabel.style.fontWeight = 'bold';

      const inputBox = document.createElement('input');
      inputBox.type = 'text';
      inputBox.placeholder = '输入一个字后回车';
      inputBox.style.padding = '8px';
      inputBox.style.fontSize = '14px';
      inputBox.style.width = '200px';
      inputBox.maxLength = '1';
      inputBox.style.border = '1px solid #ccc';
      inputBox.style.borderRadius = '4px';

      const guessedCharsDisplay = document.createElement('div');
      guessedCharsDisplay.style.marginTop = '10px';
      guessedCharsDisplay.style.fontSize = '12px';
      guessedCharsDisplay.style.color = '#999';
      guessedCharsDisplay.textContent = '已猜测字符：无';

      // 处理输入事件，使用 change 事件以兼容中文输入法
      inputBox.addEventListener('change', function (e) {
        const char = e.target.value.trim();
        if (char.length === 1) {
          const upperChar = char.toUpperCase();
          guessedCharacters.add(upperChar);

          // 更新 summary 的解密显示
          currentEncryptedSummary = originalSummary.split('').map(c => {
            if (guessedCharacters.has(c.toUpperCase()) || /[\p{P}]/u.test(c)) {
              return c;
            }
            return '■';
          }).join('');

          // 更新 name 的解密显示
          currentEncryptedName = originalCleanedName.split('').map(c => {
            if (guessedCharacters.has(c.toUpperCase())) {
              return c;
            }
            return '■';
          }).join('');

          if (currentEncryptedName === originalCleanedName) {
            // 全部猜中，显示完整内容
            const site = window.location.origin
            summaryDiv.textContent = originalSummary
            titleDiv.innerHTML = `<a href=\"${site}/subject/${currentId}\" target=\"_blank\">${originalCleanedName}</a>`;
            guessedCharsDisplay.textContent = `恭喜你猜中了！用了${guessedCharacters.size}个字。`;
            inputBox.value = '';
            inputBox.disabled = true;
            return;
          }
          summaryDiv.textContent = currentEncryptedSummary;
          titleDiv.textContent = currentEncryptedName;
          guessedCharsDisplay.textContent = '已猜测字符：' + Array.from(guessedCharacters).join('、');

          inputBox.value = '';
          inputBox.focus();
        } else if (char.length > 0) {
          // 如果输入多个字符，只取第一个
          inputBox.value = char[0];
          inputBox.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      });

      // 按下 Enter 键时也触发处理
      inputBox.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && this.value.length > 0) {
          this.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      });

      inputContainer.appendChild(inputLabel);
      inputContainer.appendChild(inputBox);
      inputContainer.appendChild(guessedCharsDisplay);

      const idLabel = document.createElement('label');
      idLabel.textContent = '给其他人出题：';
      idLabel.style.display = 'block';
      idLabel.style.marginTop = '12px';
      idLabel.style.marginBottom = '8px';
      idLabel.style.fontWeight = 'bold';

      const idInput = document.createElement('input');
      idInput.type = 'text';
      idInput.placeholder = '输入条目网址后回车';
      idInput.style.padding = '8px';
      idInput.style.fontSize = '14px';
      idInput.style.width = '200px';
      idInput.style.border = '1px solid #ccc';
      idInput.style.borderRadius = '4px';

      const idMsg = document.createElement('div');
      idMsg.style.fontSize = '12px';
      idMsg.style.color = '#999';
      idMsg.style.marginTop = '8px';
      idMsg.textContent = '';

      idInput.addEventListener('change', function (e) {
        const val = e.target.value.trim();
        const match = val.match(/\/subject\/(\d+)/);
        if (match) {
          const newUrl = new URL(window.location.origin + window.location.pathname);
          newUrl.searchParams.set('subject', match[1]);
          window.open(newUrl.toString(), '_blank');
        } else {
          idMsg.textContent = '条目地址以"/subject/数字"结尾';
        }
      });
      idInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && this.value.length > 0) {
          this.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      });

      inputContainer.appendChild(idLabel);
      inputContainer.appendChild(idInput);
      inputContainer.appendChild(idMsg);

      columnAppB.appendChild(inputContainer);
      /* ---columnAppB end:添加输入框和显示区域--- */
    }

    // 加密
    function encryptedText (text) {
      return text.replace(/[^\p{P}\p{S}]/gu, '■');
    }
  }

  // 构建入口
  const newLi = document.createElement('li');
  newLi.innerHTML = '<span style="color: #369cf8;cursor: pointer;">猜简介</span>';
  newLi.addEventListener('click', beginGame);
  document.querySelector('ul.crtChlNav').appendChild(newLi);
  if (window.location.search) beginGame();
})();
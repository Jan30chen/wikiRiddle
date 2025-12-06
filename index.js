function beginGame() {
  // 存储原始 summary
  let originalSummary = '';
  let originalCleanedName = '';
  let currentEncryptedSummary = '';
  let currentEncryptedName = '';
  let guessedCharacters = new Set();
  let currentId = null;
  let currentDate = new Date();

  // 清除之前的内容
  const columnAppA = document.getElementById('columnAppA');
  const columnAppB = document.getElementById('columnAppB');
  const puzzlesDiv = document.createElement('div');
  puzzlesDiv.id = 'puzzlesContainer';

  columnAppA.innerHTML = '';
  columnAppB.innerHTML = '';

  buildPanel();
  fetchData(new Date().getDay());

  // 获取数据
  async function fetchData(day) {
    try {
      // 基础方式 - 手动拼接
      const index_id = 85782
      const params = {
        type: 2,
        limit: 30,
        offset: 0
      };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`https://api.bgm.tv/v0/indices/${index_id}/subjects??${queryString}`)
      const data = await response.json();
      const list = data.data.map(item => item.id);
      currentId = list[day-1];
      if (list.length) {
        const response2 = await fetch(`https://api.bgm.tv/v0/subjects/${currentId}`)
        const info = await response2.json();
        buildingPuzzles(info);
      }
    } catch (error) {
      console.error('请求失败:', error);
    }
  }
  // 构建面板
  function buildPanel() {
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
    dateInput.min = `${yyyy}-${mm}-01`;
    dateInput.max = `${yyyy}-${mm}-${dd}`;
    dateInput.style.padding = '4px 6px';

    const headerTitle = document.createElement('span');
    const formatHeader = (date) => `${date.getMonth() + 1}月${date.getDate()}日的谜题`;
    headerTitle.textContent = formatHeader(currentDate);
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
      fetchData(currentDate.getDay());
    });
    headerContainer.appendChild(headerTitle);
    headerContainer.appendChild(dateInput);
    columnAppA.appendChild(headerContainer);
  }
  // 构建谜题面板
  function buildingPuzzles(info) {
    // 清空之前的内容
    puzzlesDiv.innerHTML = '';
    columnAppB.innerHTML = '';

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

    puzzlesDiv.appendChild(titleDiv);
    puzzlesDiv.appendChild(summaryDiv);
    columnAppA.appendChild(puzzlesDiv);
    /* ---columnAppA end--- */

    /* ---columnAppB start:添加输入框和显示区域--- */
    const inputContainer = document.createElement('div');
    inputContainer.style.marginTop = '20px';

    const inputLabel = document.createElement('label');
    inputLabel.textContent = '猜测文字，输入一个字后回车：';
    inputLabel.style.display = 'block';
    inputLabel.style.marginBottom = '8px';
    inputLabel.style.fontWeight = 'bold';

    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.placeholder = '简介中可能会包含什么字？';
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

    // 添加 ID 输入框
    const idLabel = document.createElement('label');
    idLabel.textContent = '猜到了？输入id后回车试试：';
    idLabel.style.display = 'block';
    idLabel.style.marginTop = '12px';
    idLabel.style.marginBottom = '8px';
    idLabel.style.fontWeight = 'bold';

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.placeholder = '纯id、条目网页都可以';
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
      if (val.length === 0) return;
      // 从输入中提取数字 token，避免较长数字包含较短数字的误判（例如 100 与 1000）
      const nums = val.match(/\d+/g);
      let matched = false;
      if (nums && nums.includes(String(currentId))) {
        matched = true;
      }
      // 兼容直接输入完全相同的非数字字符串情况
      if (!matched && val === String(currentId)) matched = true;

      if (matched) {
        // 解锁全部显示
        summaryDiv.textContent = originalSummary;
        titleDiv.textContent = originalCleanedName;
        guessedCharsDisplay.textContent = `恭喜你猜中了${currentDate.getMonth() + 1}月${currentDate.getDate()}日的谜题！用了${guessedCharacters.size}个字。`;
        idMsg.textContent = '';
        // 禁用输入，防止继续修改
        idInput.disabled = true;
        inputBox.disabled = true;
      } else {
        idMsg.textContent = 'ID 不匹配。';
      }
      idInput.value = '';
      idInput.focus();
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
  function encryptedText(text) {
    return text.replace(/[^\p{P}]/gu, '■');
  }
}

// 构建入口
const crtChlNavUl = document.querySelector('ul.crtChlNav');
if (crtChlNavUl) {
  const newLi = document.createElement('li');
  newLi.innerHTML = '<span style="color: #369cf8;cursor: pointer;">猜简介</span>';
  newLi.addEventListener('click', beginGame);
  crtChlNavUl.appendChild(newLi);
}
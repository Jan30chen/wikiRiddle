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
    let username = urlParams.get('user');
    let nickname = '';
    let currentIndex = urlParams.get('index');
    let indexName = '';
    let total = 0;

    // 清除之前的内容
    const columnAppA = document.getElementById('columnAppA');
    const columnAppB = document.getElementById('columnAppB');
    const puzzlesDiv = document.createElement('div');
    puzzlesDiv.id = 'puzzlesContainer';

    columnAppA.innerHTML = '';
    columnAppB.innerHTML = '';

    getUserInfo();

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
    // 随机返回条目id
    async function fetchData3 () {
      puzzlesDiv.innerHTML = '<p>加载谜题中……</p>';
      columnAppB.innerHTML = '';
      try {
        const limit = 30;
        const randomIndex = Math.floor(Math.random() * (total + 1));
        const params = {
          limit: limit,
          offset: Math.floor(randomIndex/limit),
          type: 2,
          subject_type: 2
        };
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`https://api.bgm.tv/v0/users/${username}/collections?&${queryString}`)
        const data = await response.json();
        const list = data.data.map(item => item['subject_id']);
        currentId = list[randomIndex%limit];
        fetchData2()
      } catch (error) {
        puzzlesDiv.innerHTML = '<p>加载谜题失败</p>';
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
    // 读取当前用户信息
    async function getUserInfo () {
      try {
        const response = await fetch(`https://api.bgm.tv/v0/users/${username}`);
        const data = await response.json();
        nickname = data.nickname;
        buildPanel();
      } catch (error) {
        puzzlesDiv.innerHTML = '<p>读取用户信息失败</p>';
        console.error('请求失败:', error);
      }
    }
    // 构建面板
    async function buildPanel () {
      const headerContainer = document.createElement('div');
      headerContainer.style.display = 'flex';
      headerContainer.style.justifyContent = 'space-between';
      headerContainer.style.alignItems = 'center';
      headerContainer.style.marginTop = '8px';
      headerContainer.style.marginBottom = '8px';

      // 清空之前的内容
      puzzlesDiv.innerHTML = '<p>读取中……</p>';
      columnAppB.innerHTML = '';
      try {
        const response = await fetch(`https://api.bgm.tv/v0/users/${username}/collections?subject_type=2&type=2`)
        data = await response.json()
        total = data.total;
      } catch (error) {
        puzzlesDiv.innerHTML = '<p>读取失败</p>';
        console.error('请求失败:', error);
      }

      const headerTitle = document.createElement('span');
      headerTitle.textContent = `当前题库：用户${nickname}的收藏`;
      headerTitle.style.color = '#f09199';
      headerTitle.style.borderBottom = '2px solid #f09199';
      headerTitle.style.fontSize = '16px';
      headerTitle.style.fontWeight = '600';
      headerTitle.style.cursor = 'pointer';

      const randomBtn = document.createElement('button');
      randomBtn.textContent = `随机抽取(共${total}部) >`;
      randomBtn.style.fontSize = '12px';
      randomBtn.style.cursor = 'pointer';
      randomBtn.style.border = '1px solid #f09199';
      randomBtn.style.background = '#f09199';
      randomBtn.style.color = '#fff';
      randomBtn.style.borderRadius = '4px';
      randomBtn.addEventListener('click', fetchData3);
      randomBtn.style.marginLeft = 'auto';

      headerContainer.appendChild(headerTitle);
      headerContainer.appendChild(randomBtn);
      columnAppA.appendChild(headerContainer);

      if (currentId) {
        fetchData2();
      }
    }
    // 构建谜题面板
    function buildPuzzles (info) {
      const {
        name_cn,
        summary
      } = info;
      /* ---columnAppA start--- */
      puzzlesDiv.innerHTML = '';
      
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
      originalSummary = summary.split('[简介原文]')[0]; // 兼容双语简介组件
      originalCleanedName = cleanedName;
      currentEncryptedSummary = encryptedText(originalSummary);
      currentEncryptedName = encryptedText(cleanedName);
      guessedCharacters.clear();

      // summaryDiv 初始显示加密后的内容
      summaryDiv.textContent = currentEncryptedSummary;

      // 检查 summary 是否含有日文假名
      const hasJapaneseKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(originalSummary);
      if (hasJapaneseKana) {
        const bannerDiv = document.createElement('div');
        bannerDiv.style.background = '#fff3cd';
        bannerDiv.style.border = '1px solid #ffc107';
        bannerDiv.style.color = '#856404';
        bannerDiv.style.padding = '10px';
        bannerDiv.style.borderRadius = '4px';
        bannerDiv.style.marginBottom = '10px';
        bannerDiv.textContent = '⚠️ 该简介可能为日文简介';
        puzzlesDiv.appendChild(bannerDiv);
      }
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

      /* ---添加给其他人出题的输入框--- */
      // const idLabel = document.createElement('label');
      // idLabel.textContent = '给其他人出题：';
      // idLabel.style.display = 'block';
      // idLabel.style.marginTop = '12px';
      // idLabel.style.marginBottom = '8px';
      // idLabel.style.fontWeight = 'bold';

      // const idInput = document.createElement('input');
      // idInput.type = 'text';
      // idInput.placeholder = '输入条目网址后回车';
      // idInput.style.padding = '8px';
      // idInput.style.fontSize = '14px';
      // idInput.style.width = '200px';
      // idInput.style.border = '1px solid #ccc';
      // idInput.style.borderRadius = '4px';

      // const idMsg = document.createElement('div');
      // idMsg.style.fontSize = '12px';
      // idMsg.style.color = '#999';
      // idMsg.style.marginTop = '8px';
      // idMsg.textContent = '';

      // idInput.addEventListener('change', function (e) {
      //   const val = e.target.value.trim();
      //   const match = val.match(/\/subject\/(\d+)/);
      //   if (match) {
      //     const newUrl = new URL(window.location.origin + window.location.pathname);
      //     newUrl.searchParams.set('subject', match[1]);
      //     window.open(newUrl.toString(), '_blank');
      //   } else {
      //     idMsg.textContent = '条目地址以"/subject/数字"结尾';
      //   }
      // });
      // idInput.addEventListener('keydown', function (e) {
      //   if (e.key === 'Enter' && this.value.length > 0) {
      //     this.dispatchEvent(new Event('change', {
      //       bubbles: true
      //     }));
      //   }
      // });

      // inputContainer.appendChild(idLabel);
      // inputContainer.appendChild(idInput);
      // inputContainer.appendChild(idMsg);
      /* ---添加给其他人出题的输入框 end--- */

      /* 题库选择输入框 */
      const addressLabel = document.createElement('label');
      addressLabel.textContent = '用户或目录地址：';
      addressLabel.style.display = 'block';
      addressLabel.style.marginTop = '12px';
      addressLabel.style.marginBottom = '8px';
      addressLabel.style.fontWeight = 'bold';

      const addressInput = document.createElement('input');
      addressInput.type = 'text';
      addressInput.placeholder = '输入用户或目录地址后回车';
      addressInput.style.padding = '8px';
      addressInput.style.fontSize = '14px';
      addressInput.style.width = '200px';
      addressInput.style.border = '1px solid #ccc';
      addressInput.style.borderRadius = '4px';

      const addressMsg = document.createElement('div');
      addressMsg.style.fontSize = '12px';
      addressMsg.style.color = '#999';
      addressMsg.style.marginTop = '8px';
      addressMsg.textContent = '';

      function openAddressUrl (value) {
        const trimmed = value.trim();
        if (!trimmed) {
          addressMsg.textContent = '请输入用户或目录地址。';
          return;
        }

        const userMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/?user\/([^\/\?#]+)$/i);
        if (userMatch) {
          const targetUrl = `${window.location.origin}/magi?user=${encodeURIComponent(userMatch[1])}`;
          window.open(targetUrl, '_blank');
          addressMsg.textContent = '';
          return;
        }

        const indexMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/?index\/([^\/\?#]+)$/i);
        if (indexMatch) {
          const targetUrl = `${window.location.origin}/magi?index=${encodeURIComponent(indexMatch[1])}`;
          window.open(targetUrl, '_blank');
          addressMsg.textContent = '';
          return;
        }

        let targetUrl;
        try {
          targetUrl = new URL(trimmed, window.location.origin);
        } catch (error) {
          addressMsg.textContent = '地址格式不正确，请输入完整 URL 或以 / 开头的路径。';
          return;
        }

        window.open(targetUrl.toString(), '_blank');
        addressMsg.textContent = '';
      }

      addressInput.addEventListener('change', function (e) {
        openAddressUrl(e.target.value);
      });
      addressInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && this.value.length > 0) {
          openAddressUrl(this.value);
        }
      });

      inputContainer.appendChild(addressLabel);
      inputContainer.appendChild(addressInput);
      inputContainer.appendChild(addressMsg);
      /* 题库选择输入框 end */


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
  // todo
  if (window.location.search.includes('subject=') || window.location.search.includes('index=') || window.location.search.includes('user=')) {
    beginGame();
  }
})();
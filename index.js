// ==UserScript==
// @name         班固米猜简介
// @author       jan30chen
// @match      https://chii.in/magi*
// @match      https://bgm.tv/magi*
// @match      https://bangumi.tv/magi*
// ==/UserScript==
(function () {

  function beginGame () {
    const urlParams = new URLSearchParams(window.location.search);
    let originalSummary = ''; // 包含标点的原始简介
    let originalCleanedName = ''; // 包含标点的原始名称
    let currentEncryptedSummary = ''; // 加密后的简介
    let currentEncryptedName = '';  // 加密后的名称
    let yearReminder, tagReminder, scoreReminder, numberReminder = ''; // 未来可能的提示类型
    let guessedCharacters = new Set();  //  用户已猜测的字符集合
    let currentId = urlParams.get('subject');
    let currentUser = urlParams.get('user');
    let currentIndex = urlParams.get('index');
    let titleName = ''; // 题库名称
    let total = 0;  // 题量

    // 清除之前的内容
    const columnAppA = document.getElementById('columnAppA');
    const columnAppB = document.getElementById('columnAppB');
    const puzzlesDiv = document.createElement('div');
    puzzlesDiv.id = 'puzzlesContainer';
    const tipDiv = document.createElement('div');
    tipDiv.id = 'tipDiv';
    tipDiv.style.textAlign = 'center';
    tipDiv.style.color = '#666';
    tipDiv.style.marginTop = '50px';
    tipDiv.style.marginBottom = '12px';

    columnAppA.innerHTML = '';
    columnAppB.innerHTML = '';
    puzzlesDiv.innerHTML = '';

    getInfo();
    buildPanelB();

    // 在题库中选取随机条目id
    async function fetchData3 () {
      puzzlesDiv.innerHTML = '';
      tipDiv.style.display = 'block';
      tipDiv.textContent = '加载谜题条目中……';
      try {
        const limit = 1;
        const randomIndex = Math.floor(Math.random() * (total + 1));
        let list = [];
        if (currentUser) {
          const params = {
            limit: limit,
            offset: Math.floor(randomIndex / limit),
            type: 2,
            subject_type: 2
          };
          const queryString = new URLSearchParams(params).toString();
          const response = await fetch(`https://api.bgm.tv/v0/users/${currentUser}/collections?${queryString}`)
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const data = await response.json();
          list = data.data.map(item => item['subject_id']);
        } else if (currentIndex) {
          const params = {
            limit: limit,
            offset: Math.floor(randomIndex / limit),
            type: 2,
          };
          const queryString = new URLSearchParams(params).toString();
          const response = await fetch(`https://api.bgm.tv/v0/indices/${currentIndex}/subjects?${queryString}`)
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const data = await response.json();
          list = data.data.map(item => item.id);
        }
        currentId = list[0];
        fetchData2()
      } catch (error) {
        tipDiv.textContent = '加载谜题失败';
        console.error('请求失败:', error);
      }
    }
    // 加载单条目数据
    async function fetchData2 () {
      tipDiv.style.display = 'block';
      tipDiv.textContent = '加载谜题中……';
      try {
        const response = await fetch(`https://api.bgm.tv/v0/subjects/${currentId}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const info = await response.json();
        buildPuzzles(info);
      } catch (error) {
        tipDiv.textContent = '加载谜题失败';
        console.error('加载单条目数据失败:', error);
      }
    }
    // 加载题库信息
    async function getInfo () {
      try {
        // 直接读取上次题库
        if (urlParams.size === 0 && localStorage.getItem('wikiRiddleId')) {
          const targetUrl = `${window.location.origin}/magi?${localStorage.getItem('wikiRiddleId')}`;
          window.open(targetUrl, '_self');
        } else if (currentUser) {
          const response = await fetch(`https://api.bgm.tv/v0/users/${currentUser}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          titleName = data.nickname;
          localStorage.setItem('wikiRiddleId', `user=${currentUser}`);
        } else if (currentIndex) {
          const response = await fetch(`https://api.bgm.tv/v0/indices/${currentIndex}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          titleName = data.title;
          localStorage.setItem('wikiRiddleId', `index=${currentIndex}`);
        } else if (currentId) {
          localStorage.setItem('wikiRiddleId', `subject=${currentId}`);
        }
        buildPanelA();
      } catch (error) {
        tipDiv.textContent = '读取信息失败';
        console.error('请求失败:', error);
      }
    }
    // 构建左侧面板
    async function buildPanelA () {
      tipDiv.textContent = '读取中……';
      tipDiv.style.display = 'block';
      // 读取题库总数
      try {
        if (currentUser) {
          const response = await fetch(`https://api.bgm.tv/v0/users/${currentUser}/collections?subject_type=2&type=2`)
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json()
          total = data.total;
        } else if (currentIndex) {
          const response = await fetch(`https://api.bgm.tv/v0/indices/${currentIndex}/subjects`)
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json()
          total = data.total;
        } else if (currentId) {
          total = 1;
          fetchData2()
        }
      } catch (error) {
        tipDiv.textContent = '读取失败';
        console.error('请求失败:', error);
      }

      const headerContainer = document.createElement('div');
      headerContainer.style.display = 'flex';
      headerContainer.style.justifyContent = 'space-between';
      headerContainer.style.alignItems = 'center';
      headerContainer.style.columnGap = '12px';
      headerContainer.style.marginTop = '8px';
      headerContainer.style.marginBottom = '8px';

      const headerTitle = document.createElement('a');
      headerTitle.textContent = currentUser ? `当前题库：用户【${titleName}】的已看` : currentIndex ? `当前题库：目录【${titleName}】` : currentId ? '单条目' : '初次使用请在右侧加载题库';
      headerTitle.href = `${window.location.origin}/anime/list/${currentUser}/collect`;
      headerTitle.target = '_blank';
      headerTitle.style.color = '#f09199';
      headerTitle.style.borderBottom = '2px solid #f09199';
      headerTitle.style.fontSize = '16px';
      headerTitle.style.fontWeight = '600';

      const randomBtn = document.createElement('button');
      randomBtn.textContent = `点击抽取(共${total}部)`;
      randomBtn.style.padding = '6px 12px';
      randomBtn.style.fontSize = '12px';
      randomBtn.style.cursor = 'pointer';
      randomBtn.style.border = 'none';
      randomBtn.style.background = '#f09199';
      randomBtn.style.color = '#fff';
      randomBtn.style.borderRadius = '4px';
      randomBtn.style.flexShrink = '0';
      randomBtn.addEventListener('click', fetchData3);

      headerContainer.appendChild(headerTitle);
      if (total > 1) {
        headerContainer.appendChild(randomBtn);
        tipDiv.textContent = '点击右上方按钮抽取谜题';
      } else {
        tipDiv.textContent = '请在右侧加载题库';
      }
      columnAppA.appendChild(headerContainer);
      columnAppA.appendChild(tipDiv);
    }
    // 构建谜题面板
    function buildPuzzles (info) {
      const { name, name_cn, summary, date, meta_tags, rating } = info;
      yearReminder = date ? `${date.split('-')[0]}年` : '';
      tagReminder = meta_tags.join('、')
      scoreReminder = rating.score ? `高于${Math.floor(rating.score)}分` : '';
      numberReminder = rating.total
      /* ---columnAppA start--- */
      tipDiv.style.display = 'none';
      const titleDiv = document.createElement('div');
      titleDiv.id = 'titleDiv';
      titleDiv.style.fontSize = '20px';
      titleDiv.style.fontWeight = 'bold';
      titleDiv.style.margin = '10px 0';
      titleDiv.style.color = '#333';

      const numberOfRaters = document.createElement('span');
      numberOfRaters.textContent = `(热度：${getStarsByAmount(numberReminder)})`;
      numberOfRaters.style.fontSize = '12px';
      numberOfRaters.style.color = '#f09199';
      numberOfRaters.style.marginLeft = '8px';
      numberOfRaters.title = `评分人数越多星号越多`;

      function getStarsByAmount (amount) {
        const thresholds = [100, 500, 2000, 5000, 10000];
        let starCount = 5;
        thresholds.some((threshold, index) => {
          if (amount < threshold) {
            starCount = index;
            return true;
          }
        })
        // 返回对应数量的★
        return '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
      }

        // 处理中文名称
        const trueName = name_cn || name;
        const cleanedName = trueName.replace(/[\p{P}\p{S}\p{Z}]/gu, '');

        const summaryDiv = document.createElement('div');
        summaryDiv.id = 'summaryDiv';
        summaryDiv.style.fontSize = '14px';
        summaryDiv.style.lineHeight = '1.6';
        summaryDiv.style.color = '#666';

        // 保存原始值和加密后的内容
        originalSummary = summary.split('[简介原文]')[0]; // 兼容双语简介组件
        originalCleanedName = cleanedName;
        currentEncryptedSummary = encryptedText(originalSummary);
        currentEncryptedName = encryptedText(originalCleanedName);
        guessedCharacters.clear();
        titleDiv.textContent = `${encryptedText(currentEncryptedName)}`;
        titleDiv.appendChild(numberOfRaters);

        // summaryDiv 初始显示加密后的内容
        summaryDiv.textContent = currentEncryptedSummary;

        // 检查 summary 是否含有超过5个日文假名
        const kanaMatches = originalSummary.match(/[\u3040-\u309F\u30A0-\u30FF]/g);
        const hasJapaneseKana = kanaMatches && kanaMatches.length > 5;
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

        const hintsContainer = document.createElement('div');
        hintsContainer.style.marginTop = '10px';
        hintsContainer.style.display = 'flex';
        hintsContainer.style.gap = '8px';
        hintsContainer.style.flexWrap = 'wrap';

        const hintData = [
          { label: '年份', text: yearReminder || '暂无提示' },
          { label: '标签', text: tagReminder || '暂无提示' },
          { label: '评分', text: scoreReminder ? scoreReminder : '暂无提示' },
          // { label: '评分人数', text: numberReminder ? {numberReminder}` : '暂无提示' }
        ];

        const hintColors = [
          { background: '#ffe8e8', border: '#ff9a9a', color: '#c0392b' },
          { background: '#e8f4ff', border: '#8ab8ff', color: '#1a73e8' },
          { background: '#e8ffe8', border: '#8ad68a', color: '#2f8f2f' },
          // { background: '#fff4e8', border: '#ffb86d', color: '#c57d1a' }
        ];

        hintData.forEach((item, index) => {
          const hintBtn = document.createElement('button');
          const styleSet = hintColors[index] || hintColors[0];
          hintBtn.textContent = item.label;
          hintBtn.style.padding = '4px 10px';
          hintBtn.style.fontSize = '12px';
          hintBtn.style.cursor = 'pointer';
          hintBtn.style.border = `1px solid ${styleSet.border}`;
          hintBtn.style.background = styleSet.background;
          hintBtn.style.color = styleSet.color;
          hintBtn.style.borderRadius = '4px';
          hintBtn.addEventListener('click', function () {
            hintBtn.textContent = item.text;
            hintBtn.disabled = true;
            hintBtn.style.borderColor = styleSet.color;
            hintBtn.style.color = styleSet.color;
            hintBtn.style.background = '#fff';
          });
          hintsContainer.appendChild(hintBtn);
        });

        puzzlesDiv.appendChild(hintsContainer);
        columnAppA.appendChild(puzzlesDiv);
        /* ---columnAppA end--- */
      }

      function buildPanelB () {
        /* ---columnAppB start:添加输入框和显示区域--- */
        const inputContainer = document.createElement('div');
        inputContainer.style.marginTop = '20px';

        const inputLabel = document.createElement('label');
        inputLabel.textContent = '简介中可能会包含什么字？';
        inputLabel.style.display = 'block';
        inputLabel.style.marginBottom = '8px';
        inputLabel.style.fontWeight = 'bold';

        const answerBtn = document.createElement('span');
        answerBtn.textContent = '查看答案';
        answerBtn.style.cursor = 'pointer';
        answerBtn.style.marginLeft = '8px';
        answerBtn.style.color = '#f09199';
        answerBtn.style.textDecoration = 'underline';
        answerBtn.addEventListener('click', function () {
          if (window.confirm('确定要直接查看答案吗？')) {
            const site = window.location.origin;
            summaryDiv.textContent = originalSummary;
            titleDiv.innerHTML = `<a href="${site}/subject/${currentId}">${originalCleanedName}</a>`;
            currentEncryptedSummary = originalSummary;
            currentEncryptedName = originalCleanedName;
            guessedCharacters = new Set(originalSummary.split('').map(c => c.toUpperCase()));
            inputBox.disabled = true;
          }
        });
        inputLabel.append(answerBtn);

        const inputBox = document.createElement('input');
        inputBox.type = 'text';
        inputBox.placeholder = '输入至多10个字后回车';
        inputBox.style.padding = '8px';
        inputBox.style.fontSize = '14px';
        inputBox.style.width = '200px';
        inputBox.style.border = '1px solid #ccc';
        inputBox.style.borderRadius = '4px';
        inputBox.maxLength = 10;

        const guessedCharsDisplay = document.createElement('div');
        guessedCharsDisplay.style.marginTop = '10px';
        guessedCharsDisplay.style.fontSize = '12px';
        guessedCharsDisplay.style.color = '#999';
        guessedCharsDisplay.textContent = '尚未开始猜测';

        // 处理输入事件，使用 change 事件以兼容中文输入法
        inputBox.addEventListener('change', function (e) {
          const inputText = e.target.value.trim();
          if (inputText.length === 0) {
            return;
          }

          const chars = Array.from(inputText).filter(c => c.trim().length > 0);
          chars.forEach(ch => guessedCharacters.add(ch.toUpperCase()));

          // 更新 summary 的解密显示
          currentEncryptedSummary = originalSummary.split('').map(c => {
              if (guessedCharacters.has(c.toUpperCase()) || /[\p{P}\p{S}]/u.test(c)) {
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

            const summaryDiv = document.getElementById('summaryDiv');
            const titleDiv = document.getElementById('titleDiv');
            if (currentEncryptedName === originalCleanedName) {
              // 全部猜中，显示完整内容
              summaryDiv.textContent = originalSummary;
              titleDiv.innerHTML = `<a href=\"${window.location.origin}/subject/${currentId}\">${originalCleanedName}</a>`;
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
        /* 题库选择输入框 */
        const addressLabel = document.createElement('label');
        addressLabel.textContent = '切换题库来源（用户首页/目录/单条目）：';
        addressLabel.style.display = 'block';
        addressLabel.style.marginTop = '12px';
        addressLabel.style.marginBottom = '8px';
        addressLabel.style.fontWeight = 'bold';

        const addressInput = document.createElement('input');
        addressInput.type = 'text';
        addressInput.placeholder = '输入地址后回车';
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
            addressMsg.textContent = '请输入用户或目录地址：';
            return;
          }

          const userMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/?user\/([^\/\?#]+)$/i);
          if (userMatch) {
            const targetUrl = `${window.location.origin}/magi?user=${encodeURIComponent(userMatch[1])}`;
            window.open(targetUrl, '_self');
            addressMsg.textContent = '';
            return;
          }

          const subjectMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/?subject\/([^\/\?#]+)$/i);
          if (subjectMatch) {
            const targetUrl = `${window.location.origin}/magi?subject=${encodeURIComponent(subjectMatch[1])}`;
            window.open(targetUrl, '_self');
            addressMsg.textContent = '';
            return;
          }

          const indexMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/?index\/([^\/\?#]+)$/i);
          if (indexMatch) {
            const targetUrl = `${window.location.origin}/magi?index=${encodeURIComponent(indexMatch[1])}`;
            window.open(targetUrl, '_self');
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
  }) ();
// ==UserScript==
// @name         班固米猜简介
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  通过键入单个字，尝试猜测某部作品中简介可能存在的字，并猜出作品
// @author       jan30chen
// @match        https://chii.in/magi*
// @match        https://bgm.tv/magi*
// @match        https://bangumi.tv/magi*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  function beginGame () {
    const urlParams = new URLSearchParams(window.location.search);
    let originalSummary = ''; // 包含标点的原始简介
    let originalCleanedName = ''; // 包含标点的原始名称
    let currentEncryptedSummary = ''; // 加密后的简介
    let currentEncryptedName = '';  // 加密后的名称
    let yearReminder, tagReminder, scoreReminder, numberReminder = ''; // 未来可能的提示类型
    let guessedCharacters = new Set();  //  用户已猜测的字符集合
    let forceReveal = false; // 是否强制展示全部答案
    let refreshPuzzleDisplay = null; // 由 buildPuzzles 初始化
    let inputBox = null;
    let guessedCharsDisplay = null;
    let currentId = urlParams.get('subject');
    let currentUser = urlParams.get('user');
    let currentIndex = urlParams.get('index');
    let titleName = ''; // 题库名称
    let total = 0;  // 题量

    const nav = document.querySelector('ul.crtChlNav');
    if (nav) {
      const navLis = nav.querySelectorAll('li');
      navLis.forEach((li, index) => {
        const link = li.querySelector('a');
        if (link) {
          if (index === navLis.length - 1) {
            // 最后一个li中的a添加focus类
            link.classList.add('focus');
          } else {
            // 其他li中的a移除focus类
            link.classList.remove('focus');
          }
        }
      });
    }

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
      randomBtn.addEventListener('click', function () {
        guessedCharacters.clear();
        forceReveal = false;
        if (inputBox) {
          inputBox.disabled = false;
          inputBox.value = '';
          inputBox.focus();
        }
        if (guessedCharsDisplay) {
          guessedCharsDisplay.textContent = '尚未开始猜测';
        }
        if (refreshPuzzleDisplay) {
          refreshPuzzleDisplay();
        }
        fetchData3();
      });

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
      scoreReminder = rating.score ? `${Math.floor(rating.score)}+` : '';
      numberReminder = rating.total
      /* ---columnAppA start--- */
      tipDiv.style.display = 'none';
      const titleDiv = document.createElement('div');
      titleDiv.id = 'titleDiv';
      titleDiv.style.fontSize = '20px';
      titleDiv.style.fontWeight = 'bold';
      titleDiv.style.margin = '10px 0';
      titleDiv.style.color = '#333';
      titleDiv.style.display = 'flex';
      titleDiv.style.flexWrap = 'wrap';
      titleDiv.style.alignItems = 'center';
      titleDiv.style.gap = '4px';

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
        const cleanedName = (name_cn || name).replace(/[\p{P}\p{S}\s]/gu, '');

        const summaryDiv = document.createElement('div');
        summaryDiv.id = 'summaryDiv';
        summaryDiv.style.fontSize = '14px';
        summaryDiv.style.fontFamily = 'LXGW WenKai';
        summaryDiv.style.lineHeight = '1.6';
        summaryDiv.style.color = '#666';
        summaryDiv.style.display = 'inline-flex';
        summaryDiv.style.flexWrap = 'wrap';
        summaryDiv.style.gap = '2px';

        // 保存原始值和加密后的内容
        originalSummary = summary.split('[简介原文]')[0].replace(/[\s]/gu, ''); // 移除空格s与换行符，兼容双语简介组件
        originalCleanedName = cleanedName;
        currentEncryptedSummary = encryptedText(originalSummary);
        currentEncryptedName = encryptedText(originalCleanedName);
        guessedCharacters.clear();
        forceReveal = false;

        function createCharacterBox (char, guessed, revealAll, opts = {}) {
          const size = typeof opts.size === 'number' ? opts.size : 20;
          const fontSize = typeof opts.fontSize === 'number' ? opts.fontSize : 12;
          const box = document.createElement('span');
          box.style.width = size + 'px';
          box.style.height = size + 'px';
          box.style.display = 'inline-flex';
          box.style.alignItems = 'center';
          box.style.justifyContent = 'center';
          box.style.border = '1px solid #ccc';
          box.style.fontSize = fontSize + 'px';
          box.style.lineHeight = '1';
          box.style.boxSizing = 'border-box';
          box.style.color = '#333';
          box.style.background = 'transparent';
          const isSymbol = /[\p{P}\p{S}]/u.test(char);
          const visible = revealAll || guessed || isSymbol;

          if (!visible) {
            box.textContent = '■';
            box.style.background = '#C7C4CC';
            box.style.color = '#C7C4CC';
            box.style.border = '1px solid #C7C4CC';
          } else {
            box.textContent = char;
            if (guessed && !isSymbol) {
              box.style.color = '#f09199';
              box.style.border = '1px solid #f09199';
            }
          }
          return box;
        }

        function renderTextBoxes (text, guessedCharacters, revealAll, opts = {}) {
          const fragment = document.createDocumentFragment();
          Array.from(text).forEach(char => {
            const upperChar = char.toUpperCase();
            const guessed = guessedCharacters.has(upperChar);
            fragment.appendChild(createCharacterBox(char, guessed, revealAll, opts));
          });
          return fragment;
        }

        refreshPuzzleDisplay = function () {
          const revealAll = forceReveal || currentEncryptedName === originalCleanedName;
          titleDiv.innerHTML = '';
          titleDiv.appendChild(renderTextBoxes(originalCleanedName, guessedCharacters, revealAll, { size: 25, fontSize: 14 }));
          titleDiv.appendChild(numberOfRaters);
          titleDiv.style.cursor = revealAll && currentId ? 'pointer' : 'default';
          titleDiv.title = revealAll && currentId ? '查看条目详情' : '';
          titleDiv.onclick = revealAll && currentId
            ? function () { window.open(`${window.location.origin}/subject/${currentId}`, '_blank'); }
            : null;
          summaryDiv.innerHTML = '';
          summaryDiv.appendChild(renderTextBoxes(originalSummary, guessedCharacters, revealAll, { size: 20, fontSize: 12 }));
        }

        refreshPuzzleDisplay();

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

        /* 提示部分 */
        const hintsContainer = document.createElement('div');
        hintsContainer.style.marginTop = '10px';
        hintsContainer.style.display = 'flex';
        hintsContainer.style.gap = '8px';
        hintsContainer.style.flexWrap = 'wrap';

        const hintsLabel = document.createElement('span');
        hintsLabel.textContent = '点击展示提示 >>';
        hintsLabel.style.fontSize = '12px';
        hintsLabel.style.color = '#666';
        hintsLabel.style.alignSelf = 'center';
        hintsLabel.style.marginRight = '6px';
        hintsContainer.appendChild(hintsLabel);

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
        /* 提示部分 end */

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
            forceReveal = true;
            currentEncryptedSummary = originalSummary;
            currentEncryptedName = originalCleanedName;
            inputBox.disabled = true;
            if (refreshPuzzleDisplay) {
              refreshPuzzleDisplay();
            }
          }
        });
        inputLabel.append(answerBtn);

        inputBox = document.createElement('input');
        inputBox.type = 'text';
        inputBox.placeholder = '输入至多10个字后回车';
        inputBox.style.padding = '8px';
        inputBox.style.fontSize = '14px';
        inputBox.style.width = '200px';
        inputBox.style.border = '1px solid #ccc';
        inputBox.style.borderRadius = '4px';
        inputBox.maxLength = 10;

        guessedCharsDisplay = document.createElement('div');
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

          currentEncryptedSummary = originalSummary.split('').map(c => {
            if (guessedCharacters.has(c.toUpperCase()) || /[\p{P}\p{S}]/u.test(c)) {
              return c;
            }
            return '■';
          }).join('');

          currentEncryptedName = originalCleanedName.split('').map(c => {
            if (guessedCharacters.has(c.toUpperCase())) {
              return c;
            }
            return '■';
          }).join('');

          if (currentEncryptedName === originalCleanedName) {
            guessedCharsDisplay.textContent = `恭喜你猜中了！用了${guessedCharacters.size}个字。`;
            inputBox.disabled = true;
          } else {
            guessedCharsDisplay.textContent = '已猜测字符：' + Array.from(guessedCharacters).join('、');
          }

          if (refreshPuzzleDisplay) {
            refreshPuzzleDisplay();
          }
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
    newLi.innerHTML = '<a href="javascript:void(0);">猜简介</a>';
    newLi.addEventListener('click', beginGame);
    document.querySelector('ul.crtChlNav').appendChild(newLi);
    if (/subject=|index=|user=/.test(window.location.search)) {
      beginGame();
    }
  }) ();
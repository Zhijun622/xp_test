(() => {
  "use strict";
  const data = window.QUIZ_DATA;
  const $ = (id) => document.getElementById(id);
  const screens = ["start-screen", "quiz-screen", "result-screen"];
  let current = 0;
  let answers = Array(data.questions.length).fill(null);
  let lastResultText = "";
  let myResultKey = null;
  let partnerKey = null;

  const showScreen = (id) => {
    screens.forEach((screenId) => $(screenId).classList.toggle("hidden", screenId !== id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function renderQuestion() {
    const q = data.questions[current];
    $("current-number").textContent = String(current + 1).padStart(2, "0");
    $("question-index").textContent = `QUESTION ${String(current + 1).padStart(2, "0")}`;
    $("question-title").textContent = q.question;
    const percent = Math.round(((current + 1) / data.questions.length) * 100);
    $("progress-fill").style.width = `${percent}%`;
    $("progress-percent").textContent = `${percent}%`;
    $("options-list").innerHTML = "";
    q.options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option" + (answers[current] === option.key ? " selected" : "");
      button.setAttribute("aria-pressed", answers[current] === option.key ? "true" : "false");
      const key = document.createElement("span");
      key.className = "option-key";
      key.textContent = option.key;
      const text = document.createElement("span");
      text.className = "option-text";
      text.textContent = option.text;
      button.append(key, text);
      button.addEventListener("click", () => {
        answers[current] = option.key;
        if (current < data.questions.length - 1) {
          current += 1;
          renderQuestion();
        } else {
          renderResult();
        }
      });
      $("options-list").appendChild(button);
    });
    $("prev-btn").disabled = current === 0;
  }

  function getOutcome(counts) {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [first, second, third] = sorted;
    if (first[1] - third[1] <= 2) return { key: "BALANCED", reason: "前三项分数接近，偏好较为多元" };
    if (first[1] - second[1] >= 3) return { key: first[0], reason: `${first[0]} 比第二高的选项多 ${first[1] - second[1]} 次，达到纯型判定条件` };
    const pair = [first[0], second[0]].sort().join("");
    return { key: pair, reason: `${first[0]} 与 ${second[0]} 两项分数接近，归入双高混合型` };
  }

  function shortLabel(key) {
    return (data.shortLabels && data.shortLabels[key]) || key;
  }

  function buildPartnerPicker() {
    const picker = $("partner-picker");
    picker.innerHTML = "";
    const order = data.resultOrder || Object.keys(data.results);
    order.forEach((key) => {
      const result = data.results[key];
      if (!result) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "partner-chip" + (partnerKey === key ? " selected" : "");
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", partnerKey === key ? "true" : "false");
      btn.dataset.key = key;
      const label = document.createElement("span");
      label.className = "partner-chip-label";
      label.textContent = shortLabel(key);
      const title = document.createElement("span");
      title.className = "partner-chip-title";
      title.textContent = (result.title || "").split("｜")[0];
      btn.append(label, title);
      btn.addEventListener("click", () => {
        partnerKey = key;
        renderChemistry();
        buildPartnerPicker();
        updateShareText();
      });
      picker.appendChild(btn);
    });
  }

  function renderChemistry() {
    const chem = $("partner-chemistry");
    const empty = $("partner-empty");
    if (!partnerKey || !myResultKey) {
      chem.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }
    const pairKey = `${myResultKey}>${partnerKey}`;
    const pairing = data.pairings && data.pairings[pairKey];
    const me = data.results[myResultKey];
    const her = data.results[partnerKey];
    $("chem-you").textContent = shortLabel(myResultKey);
    $("chem-her").textContent = shortLabel(partnerKey);
    if (pairing) {
      $("chem-title").textContent = pairing.title;
      $("chem-desc").textContent = pairing.description;
    } else {
      $("chem-title").textContent = `${me.title} × ${her.title}`;
      $("chem-desc").textContent = "这两种互动风格碰在一起，会有各自的节奏和火花。多试试其他组合，看看哪一种最像你们。";
    }
    chem.classList.remove("hidden");
    empty.classList.add("hidden");
  }

  function updateShareText() {
    if (!myResultKey) return;
    const result = data.results[myResultKey];
    const match = result.match;
    let text = `我的测试结果是「${result.title}」\n${result.tag}\n\n${result.description}`;
    if (match) {
      text += `\n\n更适配：${match.name}\n${match.line}\n${match.description}`;
    }
    if (partnerKey && data.pairings) {
      const pairing = data.pairings[`${myResultKey}>${partnerKey}`];
      const her = data.results[partnerKey];
      if (pairing && her) {
        text += `\n\n假设对象是「${her.title}」：\n${pairing.title}\n${pairing.description}`;
      }
    }
    text += `\n\n来测测你的互动偏好：${window.location.href}`;
    lastResultText = text;
  }

  function renderResult() {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    answers.forEach((answer) => { if (answer) counts[answer] += 1; });
    const outcome = getOutcome(counts);
    myResultKey = outcome.key;
    partnerKey = null;
    const result = data.results[outcome.key];
    $("result-title").textContent = result.title;
    $("result-tag").textContent = result.tag;
    $("result-summary").textContent = result.description;

    const match = result.match;
    if (match) {
      $("match-name").textContent = match.name;
      $("match-line").textContent = match.line;
      $("match-desc").textContent = match.description;
    } else {
      $("match-name").textContent = "还在探索中";
      $("match-line").textContent = "";
      $("match-desc").textContent = "不同的人会唤醒你不同的一面，适合你的不一定只有一种。";
    }

    $("score-bars").innerHTML = "";
    Object.entries(counts).forEach(([key, value]) => {
      const row = document.createElement("div");
      row.className = "score-row";
      const label = document.createElement("strong");
      label.textContent = key;
      const track = document.createElement("div");
      track.className = "score-track";
      const fill = document.createElement("div");
      fill.className = "score-fill";
      fill.style.width = `${(value / data.questions.length) * 100}%`;
      track.appendChild(fill);
      const number = document.createElement("span");
      number.className = "score-value";
      number.textContent = value;
      row.append(label, track, number);
      $("score-bars").appendChild(row);
    });
    $("score-explain").textContent = `计分结果：${outcome.reason}。A=${counts.A}，B=${counts.B}，C=${counts.C}，D=${counts.D}。`;

    buildPartnerPicker();
    renderChemistry();
    updateShareText();
    $("share-feedback").textContent = "";
    showScreen("result-screen");
  }

  $("start-btn").addEventListener("click", () => {
    current = 0;
    answers = Array(data.questions.length).fill(null);
    myResultKey = null;
    partnerKey = null;
    renderQuestion();
    showScreen("quiz-screen");
  });
  $("prev-btn").addEventListener("click", () => {
    if (current > 0) { current -= 1; renderQuestion(); }
  });
  $("restart-btn").addEventListener("click", () => {
    current = 0;
    answers = Array(data.questions.length).fill(null);
    myResultKey = null;
    partnerKey = null;
    showScreen("start-screen");
  });
  $("share-btn").addEventListener("click", async () => {
    updateShareText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "测测你的 XP", text: lastResultText });
        $("share-feedback").textContent = "已打开系统分享面板。";
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(lastResultText);
        $("share-feedback").textContent = "结果文案已复制，可以分享给朋友啦。";
      } else {
        const area = document.createElement("textarea");
        area.value = lastResultText;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
        $("share-feedback").textContent = "结果文案已复制，可以分享给朋友啦。";
      }
    } catch (error) {
      if (error && error.name !== "AbortError") $("share-feedback").textContent = "分享暂不可用，你可以截图保存结果。";
    }
  });

  if (new URLSearchParams(window.location.search).get("start") === "1") {
    current = 0;
    renderQuestion();
    showScreen("quiz-screen");
  }
})();

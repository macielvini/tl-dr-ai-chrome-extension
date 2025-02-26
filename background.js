function buildHtml(content) {
  return `
        <!DOCTYPE html>
        <html lang="pt">
            <head>
                <meta charset="UTF-8" />
                <title>Resumidor</title>
                <style>
                body {
                    font-family: Arial, sans-serif;
                    width: 600px;
                    height: 400px;
                    overflow: auto;
                    background-color: "#121212";
                    color: rgb(255, 255, 255, 0.87);
                }
                #content {
                    padding: 20px;
                }
                </style>
            </head>
            <body>
                <div id="content">
                <h1>Resposta da IA:</h1>
                <pre id="ai-content">${content}</pre>
                </div>
            </body>
        </html>
        `;
}

function injectHtml(content) {
  document.documentElement.innerHTML = content;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.content) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Injetar script na aba ativa para acessar o DOM
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: renderAiResponse,
        args: [message.content],
      });
    });
  }
});

// Quando o ícone da extensão é clicado, chama a função selectMode na aba ativa
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: selectMode,
  });
});

function renderAiResponse(response) {
  const body = document.body;
  const overlayBg = document.createElement("div");
  overlayBg.style.position = "fixed";
  overlayBg.style.top = 0;
  overlayBg.style.left = 0;
  overlayBg.style.width = "100vw";
  overlayBg.style.height = "100vh";
  overlayBg.style.zIndex = 9999;
  overlayBg.style.backgroundColor = "rgba(0, 0, 0, 0.35)";
  overlayBg.style.display = "flex";
  overlayBg.style.justifyContent = "center";
  overlayBg.style.alignItems = "center";

  const overlay = document.createElement("div");
  overlay.style.width = "80%";
  overlay.style.height = "min-content";
  overlay.style.maxHeight = "600px";
  overlay.style.borderRadius = "10px";
  overlay.style.padding = "16px";
  overlay.style.backgroundColor = "#121212";
  overlay.style.color = "rgb(255, 255, 255, 0.87)";
  overlay.style.outline = "1px solid rgb(255, 255, 255, 0.80)";
  overlay.style.overflow = "hidden";

  const title = document.createElement("h1");
  title.innerText = "Resposta da IA:";

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "Fechar";
  closeBtn.style.fontSize = "16px";
  closeBtn.style.marginTop = "16px";
  closeBtn.addEventListener("click", () => {
    overlayBg.remove();
  });

  const text = document.createElement("div");
  text.style.overflow = "auto";
  text.style.height = "min-content";
  text.style.maxHeight = "400px";
  text.style.whiteSpace = "normal";
  text.style.width = "100%";
  text.style.fontSize = "16px";
  text.style.padding = "14px 12px 16px 0";
  text.innerHTML = response;

  overlay.appendChild(title);
  overlay.appendChild(text);
  overlay.appendChild(closeBtn);
  overlayBg.appendChild(overlay);
  body.appendChild(overlayBg);
}

function selectMode() {
  let selectedElement = null;

  function removeHtmlTags(html) {
    return html.replace(/<[^>]*>/g, "");
  }

  function toggleOverlay(neverCreate = false) {
    if (document.getElementById("loading-overlay")) {
      document.getElementById("loading-overlay").remove();
      return;
    }

    if (neverCreate) return;

    const div = document.createElement("div");
    div.id = "loading-overlay";
    div.style.zIndex = 100;
    div.style.position = "fixed";
    div.style.top = 0;
    div.style.left = 0;
    div.style.width = "100vw";
    div.style.height = "100vh";
    div.style.backgroundColor = "rgba(0, 0, 0, 0.35)";
    div.style.display = "flex";
    div.style.justifyContent = "center";
    div.style.alignItems = "center";
    div.style.color = "white";
    div.style.display = "flex";
    div.style.flexDirection = "column";
    div.style.alignItems = "center";
    div.style.alignContent = "center";
    div.style.fontWeight = "bold";
    div.style.fontSize = "24px";
    div.innerHTML =
      "Carregando resposta da IA..." +
      `<div style="width: 60px; height: 60px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path fill="#FFF" stroke="#FFF" stroke-width="2" transform-origin="center" d="m148 84.7 13.8-8-10-17.3-13.8 8a50 50 0 0 0-27.4-15.9v-16h-20v16A50 50 0 0 0 63 67.4l-13.8-8-10 17.3 13.8 8a50 50 0 0 0 0 31.7l-13.8 8 10 17.3 13.8-8a50 50 0 0 0 27.5 15.9v16h20v-16a50 50 0 0 0 27.4-15.9l13.8 8 10-17.3-13.8-8a50 50 0 0 0 0-31.7Zm-47.5 50.8a35 35 0 1 1 0-70 35 35 0 0 1 0 70Z"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="2.4" values="0;120" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></path></svg></div>`;

    document.body.appendChild(div);
  }

  async function processText(selectedElement) {
    try {
      toggleOverlay();
      const aiInput = removeHtmlTags(selectedElement);
      const aiResponse = await getAiResponse(aiInput);
      chrome.runtime.sendMessage({ content: aiResponse });
    } catch (error) {
      console.error(error);
    } finally {
      toggleOverlay(true);
    }
  }

  //   FIXME: currently not working
  function errorToast(message) {
    if (document.getElementById("error-toast")) {
      document.getElementById("error-toast").remove();
    }

    const toast = document.createElement("div");
    toast.id = "error-toast";
    const style = {
      position: "fixed",
      top: "10px",
      right: "10px",
      backgroundColor: "rgb(61, 1, 1)",
      color: "white",
      padding: "10px",
      borderRadius: "5px",
      maxWidth: "300px",
      zIndex: 1000,
    };
    toast.style = { ...toast.style, style };
    toast.innerText = JSON.stringify(message, null, 2);
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 10000);
  }

  function mouseOverHandler(event) {
    if (selectedElement) {
      selectedElement.style.outline = "";
    }

    selectedElement = event.target;
    selectedElement.style.outline = "2px solid Fuchsia";
  }

  function clickHandler(event) {
    event.preventDefault();
    event.stopPropagation();

    selectedElement.style.outline = "";
    const elementHtml = event.target.outerHTML;

    processText(elementHtml);

    document.removeEventListener("mouseover", mouseOverHandler);
    document.removeEventListener("click", null);
  }

  function keyDownHandler(event) {
    if (event.key === "Escape") {
      if (selectedElement) {
        selectedElement.style.outline = "";
      }
      document.removeEventListener("mouseover", mouseOverHandler);
      document.removeEventListener("click", clickHandler);
      document.removeEventListener("keydown", keyDownHandler);
    }
  }

  async function getAiResponse(question) {
    const API_KEY = "your api key goes here";
    const MODEL = "gemini-2.0-flash"; // fell free to change https://ai.google.dev/gemini-api/docs/models/geminir

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const prompt = `A partir do texto informado, gere um resumo bem estruturado na lingua original do texto.
                    Descreva sobre o que se trata e destaque pontos importantes no texto.
                    Traga trechos importantes do texto original se fizer sentido.
                    Para quebra de linhas, insira <br>. Para formatação em markdown, use formatação com tags HTML.
                    Desconsidere texto de anúncios e ofertas.
                    `;

    const requestBody = {
      contents: [{ role: "user", parts: [{ text: question }] }],
      systemInstruction: {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
      generationConfig: {
        temperature: 1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log(data);
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Erro ao acessar a API do Gemini:", error);
    }
  }

  document.addEventListener("mouseover", mouseOverHandler);
  document.addEventListener("click", clickHandler, { once: true });
  document.addEventListener("keydown", keyDownHandler);
}

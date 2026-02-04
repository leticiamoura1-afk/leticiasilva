let carrinho = {}; // Objeto para agrupar itens: { "Nome": { preco: 10, qtd: 1, descricao: "" } }
let total = 0;
const TAXA_ENTREGA = 5.00;
const SEU_WHATSAPP_LOJA = "5584999999999"; 
const MINHA_CHAVE_PIX = "13159715426"; 

const CUPONS = {
  "LM10": { tipo: "percentual", valor: 0.10, min: 12 },
  "BEMVINDO": { tipo: "fixo", valor: 5.00, min: 30 },
  "CLIENTE15": { tipo: "percentual", valor: 0.15, min: 50 }
};

// Seletores DOM
const totalSpan = document.getElementById("total");
const listaPedido = document.getElementById("listaPedido");
const botaoFinalizar = document.querySelector(".finalizar");
const overlay = document.getElementById("overlayFormulario");
const btnVoltar = document.getElementById("btnVoltar");
const btnConfirmar = document.getElementById("btnConfirmar");
const selectPagamento = document.getElementById("formaPagamento");
const selectCupom = document.getElementById("cupomDesconto");
const areaPix = document.getElementById("areaPix");
const qrCodeImg = document.querySelector(".pix-qrcode");

// Função Pix
function gerarPayloadPix(chave, valor, beneficiario, cidade) {
    const format = (id, text) => id + text.length.toString().padStart(2, '0') + text;
    const gui = "0014BR.GOV.BCB.PIX";
    const chavePix = format("01", chave);
    const merchantAccount = format("26", gui + chavePix);
    const valorTxt = valor.toFixed(2);
    
    let payload = "000201";
    payload += merchantAccount;
    payload += "52040000"; 
    payload += "5303986"; 
    payload += format("54", valorTxt);
    payload += "5802BR";
    payload += format("59", beneficiario.toUpperCase());
    payload += format("60", cidade.toUpperCase());
    payload += "62070503***"; 
    payload += "6304"; 

    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= (payload.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
            else crc <<= 1;
        }
    }
    crc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return payload + crc;
}

function calcularTotais() {
  const cupomKey = selectCupom.value;
  let desconto = 0;
  let cupomNome = "Nenhum";

  if (CUPONS[cupomKey]) {
    const c = CUPONS[cupomKey];
    if (total >= c.min) {
      desconto = (c.tipo === "percentual") ? total * c.valor : c.valor;
      cupomNome = cupomKey;
    }
  }
  const final = (total + TAXA_ENTREGA) - desconto;
  return { final, desconto, cupomNome };
}

function atualizarQRCode(valor) {
  const payload = gerarPayloadPix(MINHA_CHAVE_PIX, valor, "LM GASTRONOMIA", "NATAL");
  qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}`;
}

// Atualizar lista visual do pedido
function atualizarInterfacePedido() {
  listaPedido.innerHTML = "";
  total = 0;

  for (const nome in carrinho) {
    const item = carrinho[nome];
    const subtotalItem = item.preco * item.qtd;
    total += subtotalItem;

    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${item.qtd}x</strong> ${nome} - R$ ${subtotalItem.toFixed(2)}</span>
      <button class="remover" onclick="removerItemDoCarrinho('${nome}')">❌</button>
    `;
    listaPedido.appendChild(li);
  }

  totalSpan.textContent = total.toFixed(2);
  
  if(selectPagamento.value === "Pix") {
    atualizarQRCode(calcularTotais().final);
  }
}

// Função chamada pelo botão ❌
window.removerItemDoCarrinho = function(nome) {
  if (carrinho[nome].qtd > 1) {
    carrinho[nome].qtd -= 1;
  } else {
    delete carrinho[nome];
  }
  atualizarInterfacePedido();
};

// Evento de clique nos botões de adicionar (+)
document.querySelectorAll(".card button").forEach(botao => {
  botao.addEventListener("click", () => {
    const card = botao.closest(".card");
    const nome = card.dataset.nome;
    const preco = Number(card.dataset.preco);
    const descricao = card.querySelector("p").textContent;

    if (carrinho[nome]) {
      carrinho[nome].qtd += 1;
    } else {
      carrinho[nome] = { preco, descricao, qtd: 1 };
    }

    atualizarInterfacePedido();
  });
});

// Lógica dos campos da modal
[selectPagamento, selectCupom].forEach(el => {
  el.addEventListener("change", () => {
    const valores = calcularTotais();
    if (selectPagamento.value === "Pix") {
      atualizarQRCode(valores.final);
      areaPix.style.display = "block";
    } else {
      areaPix.style.display = "none";
    }
  });
});

botaoFinalizar.addEventListener("click", () => {
  if (Object.keys(carrinho).length === 0) return alert("Seu pedido está vazio!");
  overlay.style.display = "flex";
});

btnVoltar.addEventListener("click", () => overlay.style.display = "none");

btnConfirmar.addEventListener("click", () => {
  const nome = document.getElementById("nomeCliente").value;
  const endereco = document.getElementById("enderecoCliente").value;
  const pagamento = selectPagamento.value;
  const observacao = document.getElementById("observacaoPedido").value.trim();

  if (!nome || !endereco || !pagamento) return alert("Preencha os campos obrigatórios!");

  const valores = calcularTotais();
  let resumo = `*🧾 NOVO PEDIDO - L&M*\n`;
  resumo += `👤 *Cliente:* ${nome}\n📍 *Endereço:* ${endereco}\n💳 *Pagamento:* ${pagamento}\n`;
  if (observacao) resumo += `📝 *Obs:* ${observacao}\n\n`;
  
  resumo += `*🍴 ITENS:*\n`;
  for (const nomeItem in carrinho) {
    const item = carrinho[nomeItem];
    resumo += `• *${item.qtd}x ${nomeItem}* - R$ ${(item.preco * item.qtd).toFixed(2)}\n`;
  }

  resumo += `\n*💰 VALORES:*\nSubtotal: R$ ${total.toFixed(2)}\n🚚 Entrega: R$ ${TAXA_ENTREGA.toFixed(2)}\n`;
  if (valores.desconto > 0) resumo += `🎁 Cupom ${valores.cupomNome}: - R$ ${valores.desconto.toFixed(2)}\n`;
  resumo += `*TOTAL: R$ ${valores.final.toFixed(2)}*\n\n`;
  resumo += `✅ *Acompanhe seu pedido:* https://wa.me/${SEU_WHATSAPP_LOJA}?text=Status%20do%20pedido%20${encodeURIComponent(nome)}\n`;
  resumo += `⭐ *Avalie-nos aqui:* ${window.location.href}?avaliar=true`;

  window.open(`https://wa.me/${SEU_WHATSAPP_LOJA}?text=${encodeURIComponent(resumo)}`, "_blank");
});

// LÓGICA DE AVALIAÇÃO
if (window.location.search.includes("avaliar=true")) {
    document.getElementById("overlayAvaliacao").style.display = "flex";
}

document.getElementById("btnEnviarAvaliacao").addEventListener("click", () => {
    const nPedido = document.getElementById("notaPedido").value;
    const nEntrega = document.getElementById("notaEntrega").value;
    const nEntregador = document.getElementById("notaEntregador").value;
    const comentario = document.getElementById("comentarioAvaliacao").value;

    let msgAvaliacao = `*⭐ AVALIAÇÃO DE CLIENTE - L&M*\n\n`;
    msgAvaliacao += `🍴 *Pedido:* ${"⭐".repeat(nPedido)}\n`;
    msgAvaliacao += `🚚 *Entrega:* ${"⭐".repeat(nEntrega)}\n`;
    msgAvaliacao += `👤 *Entregador:* ${"⭐".repeat(nEntregador)}\n`;
    if (comentario) msgAvaliacao += `\n📝 *Comentário:* ${comentario}`;

    window.open(`https://wa.me/${SEU_WHATSAPP_LOJA}?text=${encodeURIComponent(msgAvaliacao)}`, "_blank");
    document.getElementById("overlayAvaliacao").style.display = "none";
});
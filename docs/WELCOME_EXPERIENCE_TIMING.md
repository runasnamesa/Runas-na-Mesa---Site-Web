# Welcome Experience — Timing Guide

## Roteiro Cinematográfico Completo

### Timeline da Experiência (Total: ~34 segundos)

```
ACT 1: TEMPESTADE (0-4s)
├─ Estado: Tempestade intensa
├─ Neve: 100% intensidade, vento forte
├─ Camera shake: 0.3
└─ Áudio: Vento + tempestade

ACT 2: DESCOBERTA (4-7s)
├─ Estado: Luz aparece ao longe
├─ Beacon: visible
├─ Neve: 90% intensidade
└─ Áudio: Continua tempestade

ACT 3: APROXIMAÇÃO (7-11s)
├─ Estado: Luz cresce, aproximação
├─ Beacon: growing (scale 2x)
├─ Neve: 80% intensidade
└─ Áudio: Tempestade diminuindo

ACT 4: PORTA (11-14s)
├─ Estado: Porta surge claramente
├─ Door: visible + luz vazando
├─ Neve: 70% intensidade
└─ Áudio: Tempestade média

ACT 5: INTERAÇÃO (14s+)
├─ Estado: Aguarda clique do usuário
├─ UI: "ABRIR A PORTA" visível
├─ Neve: 70% mantida
└─ Tempo: Indefinido (user-driven)

ACT 6: ABERTURA (após click, ~3s)
├─ Estado: Porta abrindo
├─ Porta: Folhas rotacionam 85deg
├─ Luz: Começa a crescer
├─ Neve: 50% intensidade
└─ Áudio: Rangido + porta abrindo

ACT 7: LUZ INVADE (após 1.5s, ~3s)
├─ Estado: Luz domina a cena
├─ Luz: growing (100vmax)
├─ Neve: 30% intensidade
└─ Áudio: Transição storm → door-open

ACT 8: TRAVESSIA (após 3s, ~2s)
├─ Estado: Luz consome tudo
├─ Luz: consuming (220vmax)
├─ Neve: 10% intensidade
└─ Áudio: door-open

ACT 9: REVELAÇÃO (após 2s, ~2s)
├─ Estado: Taverna aparece
├─ Taverna: revealed
├─ Neve: 0% (desaparece)
├─ Cena bg: hidden
└─ Áudio: Transição para taverna

ACT 10: TRANSIÇÃO (após 2s, ~2s)
├─ Estado: Luz desaparece
├─ Luz: fading
├─ UI: Elementos da tempestade removidos
└─ Áudio: Taverna (fogo + ambiente)

FINAL: CONCLUSÃO (após 2s, ~4s)
├─ Estado: Taverna completa
├─ Pausa contemplativa
└─ Redirect para /index/
```

## Ajustes de Performance

### High-End Devices
- Todas as camadas de neve (5)
- Todas as animações completas
- Camera shake ativo
- 60 FPS target

### Mid-Range Devices
- 4 camadas de neve
- Animações ligeiramente reduzidas
- Camera shake reduzido
- 45 FPS target

### Low-End / Mobile
- 2 camadas de neve
- Animações simplificadas
- Sem camera shake
- 30 FPS target

### Reduced Motion
- Pula direto para taverna (0.8s)
- Sem animações
- Sem partículas

## Pontos de Teste

### ✓ Teste 1: Inicialização
- [ ] Canvas de neve renderiza
- [ ] Montanhas e cenário aparecem
- [ ] Neve começa a cair imediatamente
- [ ] Áudio inicializa sem erros

### ✓ Teste 2: Beacon e Descoberta
- [ ] Beacon aparece suavemente (4s)
- [ ] Beacon cresce gradualmente (7s)
- [ ] Transições são suaves

### ✓ Teste 3: Porta
- [ ] Porta aparece com escala correta
- [ ] Luz vaza pelas frestas
- [ ] Hint text aparece
- [ ] Hover effects funcionam

### ✓ Teste 4: Interação
- [ ] Click funciona
- [ ] Teclado (Enter/Space) funciona
- [ ] Touch funciona em mobile
- [ ] Áudio ativa após gesture

### ✓ Teste 5: Abertura
- [ ] Porta abre com física natural
- [ ] Luz cresce progressivamente
- [ ] Neve diminui gradualmente
- [ ] Som de porta toca

### ✓ Teste 6: Luz
- [ ] Luz domina a tela suavemente
- [ ] Raios volumétricos visíveis
- [ ] Transição é cinematográfica
- [ ] Não há flicker

### ✓ Teste 7: Taverna
- [ ] Taverna aparece clara
- [ ] Fogo anima corretamente
- [ ] Paleta quente contrasta bem
- [ ] Partículas de poeira visíveis

### ✓ Teste 8: Finalização
- [ ] Luz desaparece suavemente
- [ ] Elementos são limpos
- [ ] Cookie é salvo
- [ ] Redirect funciona

### ✓ Teste 9: Skip
- [ ] Botão PULAR funciona
- [ ] Pula direto para taverna
- [ ] Não deixa elementos fantasma

### ✓ Teste 10: Responsividade
- [ ] Mobile portrait funciona
- [ ] Mobile landscape funciona
- [ ] Tablet funciona
- [ ] Desktop ultrawide funciona

### ✓ Teste 11: Acessibilidade
- [ ] Screen reader announce correto
- [ ] Navegação por teclado funciona
- [ ] Focus visível
- [ ] Reduced motion respeita preferência

## Melhorias Potenciais Futuras

1. **WebGL Enhancement**: Adicionar shaders para neve mais realista em high-end
2. **Audio Espacial**: Usar Web Audio API para posicionamento 3D
3. **Loading Progressive**: Pré-carregar assets em background
4. **Analytics**: Rastrear onde usuários desistem
5. **A/B Testing**: Testar diferentes timings

## Notas de Desenvolvimento

- **Prioridade**: Atmosfera > Efeitos > Performance
- **Target**: 60fps em desktop, 30fps em mobile
- **Fallback**: Sempre funcionar, mesmo sem WebGL
- **Storytelling**: Cada transição conta história
- **Não fazer**: Loading bars, texto demais, espera desnecessária

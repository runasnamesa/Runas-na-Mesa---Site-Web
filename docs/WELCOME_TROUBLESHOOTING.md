# Welcome Screen - Troubleshooting

## ❓ Problema: Welcome Screen pula/não aparece

### Causa
A Welcome Screen usa um **cookie** (`rnm_welcome_seen`) que dura **2 dias**. Se você já visualizou a experiência antes, ela não aparece novamente automaticamente.

### ✅ Soluções

#### Solução 1: Usar modo Replay (Mais Fácil)
Adicione `?replay` na URL:
```
http://localhost:4321/?replay
```

#### Solução 2: Limpar Cookie via Console
Abra o DevTools (F12) e execute no Console:
```javascript
document.cookie = 'rnm_welcome_seen=; max-age=0; path=/; SameSite=Lax';
localStorage.removeItem('rnm_welcome_completed');
location.reload();
```

#### Solução 3: Limpar Cookies do Navegador
1. Abra DevTools (F12)
2. Vá em **Application** > **Cookies**
3. Delete o cookie `rnm_welcome_seen`
4. Recarregue a página

#### Solução 4: Usar Modo Anônimo/Privado
- Chrome: Ctrl+Shift+N
- Firefox: Ctrl+Shift+P
- Edge: Ctrl+Shift+N

Navegação privada não salva cookies entre sessões.

### 🐛 Debug Mode

A nova versão inclui logs no console que ajudam a debugar:

```javascript
[Welcome] No cookie found - showing experience
// ou
[Welcome] Cookie found and valid - skipping to main site
[Welcome] Seen at: 24/07/2026, 12:00:00
[Welcome] Add ?replay to URL to see experience again
```

### 📝 Como Funciona o Cookie

```javascript
// Cookie é salvo após completar a experiência
document.cookie = `rnm_welcome_seen=${Date.now()}; max-age=172800; path=/; SameSite=Lax`;

// Duração: 172800 segundos = 48 horas = 2 dias
```

### 🔧 Para Desenvolvimento

Se você está desenvolvendo e precisa ver a Welcome Screen frequentemente:

**Opção 1**: Sempre use `?replay`
```
http://localhost:4321/?replay
```

**Opção 2**: Reduzir tempo do cookie temporariamente

No código (`WelcomeEntry.astro`), linha ~1053, mude:
```typescript
// De:
document.cookie = `rnm_welcome_seen=${now}; max-age=172800; path=/; SameSite=Lax`;

// Para (60 segundos):
document.cookie = `rnm_welcome_seen=${now}; max-age=60; path=/; SameSite=Lax`;
```

**Opção 3**: Desabilitar completamente o cookie

Comente as linhas de verificação:
```typescript
// if (checkSeen()) {
//   location.replace('/index/');
// }
```

### 🎯 Verificar Estado Atual

No console do navegador:
```javascript
// Ver cookie atual
document.cookie.split(';').find(c => c.includes('rnm_welcome_seen'))

// Ver localStorage
localStorage.getItem('rnm_welcome_completed')

// Ver timestamp convertido
const cookie = document.cookie.split(';').find(c => c.includes('rnm_welcome_seen'));
if (cookie) {
  const ts = parseInt(cookie.split('=')[1]);
  console.log('Cookie salvo em:', new Date(ts).toLocaleString());
  console.log('Expira em:', new Date(ts + 172800000).toLocaleString());
}
```

### ⏱️ Timeline do Cookie

```
[First Visit]
  ↓
[Experience completes] → Cookie saved
  ↓
[Refresh page] → Cookie detected → Skip to /index/
  ↓
[48 hours pass]
  ↓
[Cookie expires]
  ↓
[Next visit] → Experience shows again
```

### 🚀 Em Produção

Em produção, o comportamento é esperado:
- **Primeira visita**: Mostra Welcome Screen
- **Visitas seguintes (< 2 dias)**: Pula para site principal
- **Após 2 dias**: Mostra Welcome Screen novamente

Se quiser mudar esse comportamento, ajuste a linha do cookie:
- `max-age=86400` = 1 dia
- `max-age=604800` = 7 dias
- `max-age=2592000` = 30 dias

---

## 📞 Checklist Rápido

Se a Welcome Screen não aparece:

- [ ] Verifique no console: `document.cookie` contém `rnm_welcome_seen`?
- [ ] Adicione `?replay` na URL
- [ ] Limpe os cookies do site
- [ ] Use navegação privada
- [ ] Verifique os logs no console do navegador

## ✅ Tudo OK?

Se você completou a experiência e ela pulou automaticamente na próxima vez, **está funcionando corretamente!** 🎉

Para testar novamente: `http://localhost:4321/?replay`

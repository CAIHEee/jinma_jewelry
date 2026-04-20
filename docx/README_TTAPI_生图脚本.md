# TTAPI 生图脚本

这套脚本基于你给的 TTAPI 文档整理：

- Flux 文档：`https://docs.ttapi.io/api/cn/flux/generate`
- Flux 网格说明：`https://docs.ttapi.io/grids/cn/start/introduction`
- Midjourney 文档：`https://docs.ttapi.io/api/cn/midjourney`
- Nano Banana 文档：`https://docs.ttapi.io/api/cn/gemini/generate`

## 已生成脚本

- `scripts/flux_basic.py`
- `scripts/flux_2_max.py`
- `scripts/flux_2_pro.py`
- `scripts/flux_kontext_max.py`
- `scripts/flux_kontext_pro.py`
- `scripts/nano_banana_pro.py`
- `scripts/nano_banana_2.py`

## 我采用的模型映射

- `flux_basic.py` -> `flux1-dev`
- `flux_2_max.py` -> `flux-2-max`
- `flux_2_pro.py` -> `flux-2-pro`
- `flux_kontext_max.py` -> `flux-kontext-max`
- `flux_kontext_pro.py` -> `flux-kontext-pro`
- `nano_banana_pro.py` -> `gemini-3-pro-image-preview`
- `nano_banana_2.py` -> `gemini-3.1-flash-image-preview`

## 先设置 API Key

PowerShell:

```powershell
$env:TT_API_KEY="你的 TTAPI Key"
```

也可以每次运行时带上：

```powershell
python .\scripts\flux_2_max.py --api-key "你的 TTAPI Key"
```

## 运行示例

Flux 基础版：

```powershell
python .\scripts\flux_basic.py --prompt "一枚高端钻戒产品图，白底棚拍，超写实，广告大片质感"
```

Flux 2 Max：

```powershell
python .\scripts\flux_2_max.py --prompt "奢华珠宝项链海报，黑金背景，戏剧化布光，超写实"
```

Flux 2 Pro：

```powershell
python .\scripts\flux_2_pro.py --prompt "高级珠宝耳环商业广告图，镜面反射台面，高清细节"
```

Flux Kontext Max：

```powershell
python .\scripts\flux_kontext_max.py --prompt "钻石手链特写，柔光棚拍，极致细节，电商主图风格"
```

Flux Kontext Pro：

```powershell
python .\scripts\flux_kontext_pro.py --prompt "祖母绿戒指英雄镜头，电影级光影，真实材质"
```

Nano Banana Pro：

```powershell
python .\scripts\nano_banana_pro.py --prompt "一枚红宝石戒指产品海报，奢华高级，超清细节"
```

Nano Banana 2：

```powershell
python .\scripts\nano_banana_2.py --prompt "珍珠项链品牌广告图，柔和高定风格，时尚杂志质感"
```

## 常用参数

Flux 脚本支持：

```powershell
python .\scripts\flux_2_max.py `
  --prompt "珠宝产品图" `
  --size "1024x1024" `
  --aspect-ratio "1:1" `
  --poll-interval 3 `
  --poll-attempts 40 `
  --print-response
```

Nano Banana 脚本支持：

```powershell
python .\scripts\nano_banana_pro.py `
  --prompt "珠宝海报" `
  --aspect-ratio "1:1" `
  --image-size "1K" `
  --thinking-level "Minimal" `
  --refer-image "https://example.com/ref1.png" `
  --refer-image "https://example.com/ref2.png" `
  --print-response
```

## 输出位置

默认会把图片保存到：

```text
outputs/<脚本名>/
```

例如：

```text
outputs/flux_2_max/
outputs/nano_banana_pro/
```

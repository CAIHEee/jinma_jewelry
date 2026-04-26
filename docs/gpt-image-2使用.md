# gpt-image-2 模型接口使用文档
**Base URL**：`https://aiapis.help/v1`

---

## 一、接口通用说明
1. **请求方式**：均为 `POST`
2. **数据格式**：请求体统一使用 `JSON`
3. **鉴权方式**：请求头携带 `Authorization`
   - 格式：`Authorization: Bearer <your_api_key>`
4. **返回格式**：统一 `JSON`，返回图片 **base64** 数据
5. **文档约定**：返回示例中 base64 超长内容用简写 `iVBORw0KGgoAAAAN...` 代替

---

## 二、图片生成接口
### 2.1 接口描述
根据文本描述生成一张或多张图片，返回图片 base64 编码数据。

- **接口地址**：`/images/generations`
- **请求方法**：`POST`

### 2.2 请求参数
| 参数名 | 类型 | 是否必填 | 说明 |
|--------|------|----------|------|
| model | string | 是 | 固定为：`gpt-image-2` |
| prompt | string | 是 | 图片生成描述词，支持中英文 |
| n | integer | 否 | 生成图片数量，默认 1，最大支持 4 |
| size | string | 否 | 图片尺寸，可选：`256x256`、`512x512`、`1024x1024`，默认 `1024x1024` |
| response_format | string | 是 | 固定传：`b64_json` |
| quality | string | 否 | 生成质量，可选 `standard` / `hd`，默认 `standard` |
| style | string | 否 | 风格，可选 `vivid`（生动）/ `natural`（自然），默认 `natural` |

### 2.3 调用示例（cURL）
```bash
curl https://aiapis.help/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "A futuristic city at sunset, cyberpunk style, high detail",
    "n": 1,
    "size": "1024x1024",
    "response_format": "b64_json",
    "quality": "hd",
    "style": "vivid"
  }'
```

### 2.4 成功返回示例
```json
{
  "created": 1712345678,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAAN...",
      "revised_prompt": "A futuristic cyberpunk city at sunset with neon lights and high detail architecture"
    }
  ]
}
```

---

## 三、图片编辑接口（蒙版编辑）
### 3.1 接口描述
对已有图片进行局部编辑，返回编辑后图片的 base64 数据。

- **接口地址**：`/images/edits`
- **请求方法**：`POST`
- **Content-Type**：`multipart/form-data`

### 3.2 请求参数
| 参数名 | 类型 | 是否必填 | 说明 |
|--------|------|----------|------|
| model | string | 是 | 固定为：`gpt-image-2` |
| prompt | string | 是 | 编辑描述，描述需要修改的内容 |
| image | file | 是 | 原始图片，必须为 **PNG**，尺寸正方形，≤4MB |
| mask | file | 否 | 蒙版图片，黑色保留，白色编辑，格式同原图 |
| n | integer | 否 | 生成数量，默认 1，最大 4 |
| size | string | 否 | 尺寸：`256x256`/`512x512`/`1024x1024` |
| response_format | string | 是 | 固定传：`b64_json` |

### 3.3 调用示例（cURL）
```bash
curl https://aiapis.help/v1/images/edits \
  -H "Authorization: Bearer your_api_key" \
  -F model="gpt-image-2" \
  -F prompt="Add a white cat sitting on the sofa" \
  -F image=@/path/original.png \
  -F mask=@/path/mask.png \
  -F n=1 \
  -F size="1024x1024" \
  -F response_format="b64_json"
```

### 3.4 返回示例
```json
{
  "created": 1712345699,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAAN..."
    }
  ]
}
```

---

## 四、图片变体生成接口
### 4.1 接口描述
基于参考图片生成风格相似的变体图，返回变体图片 base64 数据。

- **接口地址**：`/images/variations`
- **请求方法**：`POST`
- **Content-Type**：`multipart/form-data`

### 4.2 请求参数
| 参数名 | 类型 | 是否必填 | 说明 |
|--------|------|----------|------|
| model | string | 是 | 固定为：`gpt-image-2` |
| image | file | 是 | 参考图片，PNG 格式，正方形，≤4MB |
| n | integer | 否 | 变体数量，默认 1，最大 4 |
| size | string | 否 | 尺寸：`256x256`/`512x512`/`1024x1024` |
| response_format | string | 是 | 固定传：`b64_json` |

### 4.3 调用示例（cURL）
```bash
curl https://aiapis.help/v1/images/variations \
  -H "Authorization: Bearer your_api_key" \
  -F model="gpt-image-2" \
  -F image=@/path/sample.png \
  -F n=1 \
  -F size="1024x1024" \
  -F response_format="b64_json"
```

### 4.4 返回示例
```json
{
  "created": 1712345711,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAAN..."
    }
  ]
}
```

---

## 五、错误码说明
| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误 / 图片格式不合法 / 描述词违规 |
| 401 | API Key 无效或未携带鉴权信息 |
| 402 | 额度不足 / 账号欠费 |
| 404 | 接口地址错误或模型不存在 |
| 429 | 请求频率超限 |
| 500 | 服务端内部错误 |

---

## 六、使用限制
1. 图片必须为 **PNG 格式**，尺寸为正方形
2. 图片大小不超过 **4MB**
3. 单次生成最大数量为 4 张
4. 敏感内容、违规场景将被拦截并返回错误

# 五音科技中转 GPT Image 2 测试脚本

脚本位置：

- `docx/scripts/wuyinkeji_gpt_image2.py`

接口文档：

- `https://api.wuyinkeji.com/doc/53`
- `https://api.wuyinkeji.com/doc/47`

## 认证

脚本使用 `Authorization` 请求头，支持两种传参方式：

```bash
export WUYIN_API_KEY="你的 key"
```

或者：

```bash
python docx/scripts/wuyinkeji_gpt_image2.py --api-key "你的 key"
```

## 运行示例

```bash
python docx/scripts/wuyinkeji_gpt_image2.py \
  --api-key "你的 key" \
  --prompt "一枚18K金钻石戒指产品图，白色无影背景，超写实商业棚拍" \
  --size "1:1" \
  --count 1 \
  --print-response
```

## 输出位置

默认输出到：

```text
docx/outputs/wuyinkeji_gpt_image2/
```

脚本流程：

1. `POST /api/async/image_gpt` 提交任务
2. 读取返回的 `data.id`
3. `GET /api/async/detail?id=...` 轮询状态
4. 当 `data.result` 返回图片 URL 数组时自动下载

已验证状态语义：

- `0`：处理中
- `1`：失败
- `2`：成功

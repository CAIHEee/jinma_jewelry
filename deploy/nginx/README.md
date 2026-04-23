# Nginx 部署说明

这个目录放的是生产环境 `nginx` 配置，当前用途：

- 托管前端 `frontend/dist`
- 反向代理 `/api` 到 FastAPI
- 反向代理 `/health` 到后端健康检查

当前提供两套配置：

- [jinma.conf](/home/chaihe/projects/jinma_jewelry_system/deploy/nginx/jinma.conf)：宿主机直接安装 nginx 时使用，后端默认走 `127.0.0.1:8000`
- [jinma.docker.conf](/home/chaihe/projects/jinma_jewelry_system/deploy/nginx/jinma.docker.conf)：Docker 网络内使用，后端默认走 `backend:8000`

## 目录约定

当前配置默认前端静态文件路径为：

```text
/var/www/jinma/frontend/dist
```

如果你的部署路径不同，请同步修改 [jinma.conf](/home/chaihe/projects/jinma_jewelry_system/deploy/nginx/jinma.conf) 里的 `root`。

## 使用步骤

1. 构建前端

```bash
cd /home/chaihe/projects/jinma_jewelry_system/frontend
npm install
npm run build
```

2. 把 `dist` 部署到目标机器，例如：

```bash
sudo mkdir -p /var/www/jinma/frontend
sudo rsync -av --delete /home/chaihe/projects/jinma_jewelry_system/frontend/dist/ /var/www/jinma/frontend/dist/
```

3. 安装并启用 nginx 配置

```bash
sudo cp /home/chaihe/projects/jinma_jewelry_system/deploy/nginx/jinma.conf /etc/nginx/conf.d/jinma.conf
sudo nginx -t
sudo systemctl reload nginx
```

4. 确保后端服务运行在：

```text
127.0.0.1:8000
```

## Docker 场景

如果后续要把前端和 nginx 一起打进容器，可以直接使用：

- [Dockerfile](/home/chaihe/projects/jinma_jewelry_system/deploy/nginx/Dockerfile)
- [jinma.docker.conf](/home/chaihe/projects/jinma_jewelry_system/deploy/nginx/jinma.docker.conf)

构建命令示例：

```bash
cd /home/chaihe/projects/jinma_jewelry_system
docker build -f deploy/nginx/Dockerfile -t jinma-frontend-nginx .
```

这个镜像会：

- 先在构建阶段执行前端 `npm run build`
- 再用 `nginx` 承载静态页面
- 把 `/api` 和 `/health` 转发到 Docker 网络中的 `backend:8000`

## 说明

- 这是单机部署配置，不做多机负载均衡。
- 当前没有加 HTTPS，后续如需公网访问，建议前面再补证书配置。
- `client_max_body_size 50m` 是为了适配图片上传，后续如果上传图更大，可以继续调高。

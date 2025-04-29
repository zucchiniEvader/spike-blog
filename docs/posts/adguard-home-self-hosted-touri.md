---
title: 自建 AdGuard Home 实现 HTTPS (DoH) 访问
date: "2025-04-29 14:01:11"
summary: "Self-hosted AdGuard Home with HTTPS (DoH) access"
---

---

# 自建 AdGuard Home 并通过 Nginx 实现 HTTPS (DoH) 访问教程

本教程将指导你如何在 Linux 服务器上使用 Docker 部署 AdGuard Home，并通过 Nginx 设置反向代理，将 HTTPS (DoH) 请求转发到 AdGuard Home，从而实现通过域名和 HTTPS 访问你的 DNS 服务。

**为什么这样做？**

- **安全性：** 通过 HTTPS 加密 DNS 查询，防止 DNS 劫持和中间人攻击。
- **隐私性：** 隐藏你的 DNS 查询内容，提高网络隐私。
- **集中管理：** 在 AdGuard Home 中集中管理 DNS 过滤规则、日志和统计信息。
- **利用 Nginx 的优势：** Nginx 可以处理 SSL/TLS 卸载、负载均衡（如果你有多个 AdGuard Home 实例）、请求限制等，提高服务的健壮性和安全性。

**先决条件：**

1.  一台运行 Linux 的服务器（例如 Ubuntu、CentOS 等）。
2.  已安装 Docker 和 Docker Compose (可选，但推荐)。
3.  已安装 Nginx。
4.  一个可以解析到你的服务器公网 IP 的域名。
5.  该域名的 SSL/TLS 证书和私钥文件 (例如 `fullchain.pem` 和 `privkey.pem`)。你可以使用 Let's Encrypt 等免费服务获取。
6.  服务器防火墙已放行 443 端口的入站流量。

**教程步骤：**

## 步骤 1：部署 AdGuard Home (使用 Docker)

我们将使用你的 Docker 启动命令来部署 AdGuard Home。

```bash
# 创建用于存储 AdGuard Home 配置和工作文件的目录
mkdir -p /root/adguardhome/work /root/adguardhome/conf

# 运行 AdGuard Home Docker 容器
docker run --name adguardhome \
    --restart unless-stopped \
    -v /root/adguardhome/work:/opt/adguardhome/work \
    -v /root/adguardhome/conf:/opt/adguardhome/conf \
    -p 10053:53/tcp -p 10053:53/udp \
    -p 10067:67/udp -p 10068:68/udp \
    -p 10801:10080/tcp -p 10443:443/tcp -p 10443:443/udp -p 13000:3000/tcp \
    -p 10853:853/tcp \
    -p 10853:853/udp \
    -p 15443:5443/tcp -p 15443:5443/udp \
    -p 16060:6060/tcp \
    -d adguard/adguardhome

# 查看容器状态，确保它正在运行
docker ps -a
```

**命令解释：**

- `docker run --name adguardhome`: 创建并命名一个容器为 `adguardhome`。
- `--restart unless-stopped`: 设置容器在 Docker 重启或自身崩溃后自动重启，除非手动停止。
- `-v /root/adguardhome/work:/opt/adguardhome/work`: 将宿主机的 `/root/adguardhome/work` 目录映射到容器内的 `/opt/adguardhome/work`，用于存放 AdGuard Home 的工作文件（如日志、统计）。
- `-v /root/adguardhome/conf:/opt/adguardhome/conf`: 将宿主机的 `/root/adguardhome/conf` 目录映射到容器内的 `/opt/adguardhome/conf`，用于存放 AdGuard Home 的配置文件。这样你可以在宿主机上修改配置文件，并且容器删除后配置不会丢失。
- `-p <宿主机端口>:<容器端口>/<协议>`: 端口映射，将宿主机的端口映射到容器内的端口。
  - `10053:53/tcp`, `10053:53/udp`: 将宿主机的 10053 端口映射到容器的 53 端口（标准 DNS 端口）。用于普通的 DNS 查询。
  - `10067:67/udp`, `10068:68/udp`: DHCP 端口映射，通常不需要对外开放，除非你在 AdGuard Home 中使用 DHCP 功能。
  - `10801:10080/tcp`: 将宿主机的 10801 端口映射到容器的 10080 端口（AdGuard Home Web 界面的默认 HTTP 端口）。用于访问 AdGuard Home 的管理界面。
  - `10443:443/tcp`, `10443:443/udp`: 将宿主机的 10443 端口映射到容器的 443 端口（标准 HTTPS 端口）。AdGuard Home 容器内部会监听 443 端口用于 DoH/DoT/QUIC，但我们这里将使用 Nginx 处理外部 443 流量，AdGuard Home 内部可以监听其他端口用于 HTTP。
  - `13000:3000/tcp`: 将宿主机的 13000 端口映射到容器的 3000 端口（AdGuard Home 默认的 HTTP 端口）。这个端口通常用于 AdGuard Home 的初始设置向导。
  - `10853:853/tcp`, `10853:853/udp`: DoT 端口映射。
  - `15443:5443/tcp`, `15443:5443/udp`: DoQ (QUIC) 端口映射。
  - `16060:6060/tcp`: AdGuard Home 的统计信息端口。
- `-d adguard/adguardhome`: 在后台运行 `adguard/adguardhome` 镜像。

**初始设置 AdGuard Home：**

首次启动容器后，通过浏览器访问 `http://你的服务器IP地址:10801` 来进行 AdGuard Home 的初始设置。设置用户名和密码，并配置监听接口。

在配置监听接口时，为了配合 Nginx 反向代理，你需要确保 AdGuard Home **监听一个本地地址和端口用于 DoH 的 HTTP 请求**。通常，你会在 AdGuard Home 的 "加密设置" 中指定 DoH 监听地址和端口。例如，配置 AdGuard Home 在 `127.0.0.1` 的 `10043` 端口监听 DoH 的 **HTTP** 请求。

在 AdGuard Home 的加密设置中，请 **不要** 勾选 "通过 HTTPS 加密 DNS 请求" 或配置证书，因为这部分将由 Nginx 来处理。你只需要配置它在 `127.0.0.1:10443` 监听来自 Nginx 的 HTTP 请求即可。

## 步骤 2：配置 Nginx 反向代理

修改或创建一个 Nginx 配置文件来处理 HTTPS 请求并转发到 AdGuard Home。

找到 Nginx 的配置文件目录 (通常是 `/etc/nginx/sites-available/` 或 `/etc/nginx/conf.d/`)，创建一个新的配置文件，例如 `adguardhome-doh.conf`。

```nginx
# 使用你的文本编辑器打开并编辑配置文件
# 例如： nano /etc/nginx/conf.d/adguardhome-doh.conf
```

将以下内容粘贴到文件中，并根据你的实际情况进行修改：

```nginx
server {
    listen 443 ssl;
    server_name your_doh_domain.com; # <--- 替换为你的 DoH 域名

    # <--- 替换为你的证书和私钥文件路径
    ssl_certificate /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;

    # 推荐的安全 SSL 设置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    # resolver 127.0.0.1 8.8.8.8 valid=300s; # <--- 根据需要修改你的resolver

    # 限制请求方法，DoH 通常只使用 POST 或 GET
    # 建议限制为 POST，因为 DoH 通常使用 POST 发送较大的请求体
    # 如果你的客户端使用 GET，也需要包含 GET
    # limit_except POST {
    #    deny all;
    # }

    location /dns-query {
        # <--- 确保这里的地址和端口与 AdGuard Home 监听的 HTTP DoH 端口一致
        proxy_pass http://127.0.0.1:10443; # AdGuard Home 监听 DoH 的地址和端口

        # 确保传递必要的 Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Content-Type application/dns-message; # DoH 标准 Content-Type

        # 可选：如果你希望 AdGuard Home 识别原始客户端 IP
        # 某些 AdGuard Home 版本可能需要配置 X-Forwarded-For 信任

        # 超时设置 (根据需要调整)
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;

        # 其他可能的proxy设置 (根据需要添加)
        # proxy_buffering off;
        # proxy_request_buffering off;
    }

    # 可以添加一个默认 location 来处理非 /dns-query 的请求
    # location / {
    #     return 404; # 或者返回一个简单的页面
    # }
}
```

**修改配置文件中的占位符：**

- `your_doh_domain.com`: 替换为你实际用于 DoH 服务的域名。
- `/path/to/your/fullchain.pem`: 替换为你的 SSL/TLS 证书文件的完整路径。
- `/path/to/your/privkey.pem`: 替换为你的 SSL/TLS 私钥文件的完整路径。
- `proxy_pass http://127.0.0.1:10443;`: 确认这个地址和端口与你在 AdGuard Home 中配置的 DoH HTTP 监听地址和端口一致。

**启用 Nginx 配置并检查语法：**

```bash
# 如果你将文件放在 sites-available 目录下，需要创建软链接到 sites-enabled
# sudo ln -s /etc/nginx/sites-available/adguardhome-doh.conf /etc/nginx/sites-enabled/

# 检查 Nginx 配置语法是否有误
sudo nginx -t

# 如果语法正确，重载 Nginx 配置使其生效
sudo systemctl reload nginx
# 或者重启 Nginx
# sudo systemctl restart nginx
```

## 步骤 3：配置客户端使用 DoH 服务

现在，你可以配置你的设备、浏览器或应用程序使用你的自建 DoH 服务了。

客户端需要配置的 DoH URL 是：

```
https://your_doh_domain.com/dns-query
```

**重要提示：**

- 确保你的域名已经正确地解析到你的服务器公网 IP。
- 确保你的服务器防火墙允许来自客户端的 443 端口连接。
- 确保 AdGuard Home 正在运行，并且监听在 Nginx 配置的 `proxy_pass` 所指定的地址和端口。
- 如果遇到问题，检查 Nginx 的错误日志 (`/var/log/nginx/error.log`) 和 AdGuard Home 的日志。

通过以上步骤，你就成功地使用 Nginx 反向代理实现了 AdGuard Home 的 HTTPS (DoH) 访问，为你的网络提供了更加安全和私密的 DNS 解析服务。

---

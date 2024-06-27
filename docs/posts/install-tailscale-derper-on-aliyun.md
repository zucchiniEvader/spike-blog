---
title: "在阿里云上安装tailscale derper中继服务"
date: '2024-06-26 21:31:12'
summary: "how to install tailscale derper service on aliyun."
---

## 前言

在阿里云上安装derper服务，为了不被别人薅羊毛，需要在服务器上登录自己的tailscale账号，这样就可以让这个derper只允许我自己使用。

但是在阿里云上使用tailscale有个问题是阿里云内网DNS用的10.100.0.0/10网段，和taiscale分配的网段有冲突，所以需要修改下阿里云的DNS配置。

## 操作

1. 备份原来的DNS配置

```bash
mv /etc/resolv.conf /etc/resolv.conf.bak
```

2. 配置新的DNS配置

```bash
echo "nameserver 114.114.114.114" > /etc/resolv.conf
```

3. 使配置生效

```bash
systemctl restart systemd-resolved
```

4. 锁定DNS配置

```bash
chattr +i /etc/resolv.conf
```
> 如果需要再次修改DNS配置，需要先解锁

5. 重启tailscale服务

```bash
tailscale down && tailscale up
```

## DNS切换

在修改DNS配置之后，阿里云的内网DNS就不能用了，就是访问阿里云的内网无法访问，包括如`apt install`等操作，如果需要则改会内网DNS。

这里我提供一个快速切换的shell脚本：

```bash
#!/bin/bash

if [ -f /etc/resolv.conf.bak ]; then
    mv /etc/resolv.conf.bak /etc/resolv.conf
    systemctl restart systemd-resolved
    chattr +i /etc/resolv.conf
    echo "switch to aliyun dns"
else
    mv /etc/resolv.conf /etc/resolv.conf.bak
    echo "nameserver 114.114.114.114" > /etc/resolv.conf
    systemctl restart systemd-resolved
    chattr +i /etc/resolv.conf
    echo "switch to 114 dns"
fi
```

## 新的问题

目前我可以通过官方渠道安装的版本是`1.68.1`，这个版本在开启derper服务的时候会报错：

```bash
client xxxxxxxxxxxxxxxxxxxxxxxxx rejected: failed to query local tailscaled status for nodekey:xxxxxxxxxxxxxxxxxxx: 400 Bad Request: invalid 'addr' parameter
```

根据[v2ex网友这个回复](https://fast.v2ex.com/t/1031463#r_14876176) 的说法，我们需要自己编译main分支的tailscale，这样就可以解决这个问题。

1. clone tailscale代码

```bash
git clone https://github.com/tailscale/tailscale.git
```

2. 编译tailscale（在readme中有这两行脚本）

```bash
cd tailscale/
./build_dist.sh tailscale.com/cmd/tailscale
./build_dist.sh tailscale.com/cmd/tailscaled
```

3. 安装tailscale

```bash
mv tailscale /usr/bin/
mv tailscaled /usr/sbin/
```

4. 重启tailscale服务

```bash
systemctl restart tailscaled
tailscale down && tailscale up
```

此时再看derper的日志已经正常了。
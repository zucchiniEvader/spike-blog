---
title: "在debian12上安裝virtualbox"
date: '2024-01-29'
summary: "how to install virtualbox on debian12"
---

方式一：使用官方源安裝

```bash
wget -O- -q https://www.virtualbox.org/download/oracle_vbox_2016.asc | sudo gpg --dearmour -o /usr/share/keyrings/oracle_vbox_2016.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/oracle_vbox_2016.gpg] http://download.virtualbox.org/virtualbox/debian bullseye contrib" | sudo tee /etc/apt/sources.list.d/virtualbox.list

sudo apt update

sudo apt install virtualbox-7.0
```

最後在安裝好之後需要將自己的用戶添加到vboxusers組中，否則會報錯

```bash
sudo usermod -a -G vboxusers $USER
```

方式二：使用官方提供的deb包安裝

從官網下載deb安裝包，然後使用dpkg安裝即可
下載地址：https://www.virtualbox.org/wiki/Linux_Downloads

```bash
sudo dpkg -i virtualbox-7.0_7.0.34-143927~Debian~bullseye_amd64.deb
```

同樣在安裝好之後需要將自己的用戶添加到vboxusers組中，否則會報錯

```bash
sudo usermod -a -G vboxusers $USER
```

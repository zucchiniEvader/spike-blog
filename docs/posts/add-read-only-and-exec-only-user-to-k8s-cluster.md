---
title: 为k8s集群添加读权限和exec权限的用户
date: '2024-06-27 20:27:11'
summary: "Add read-only and exec-only user to k8s cluster"
---

1. 创建自定义ClusterRole
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-with-exec
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "exec"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources: ["jobs", "cronjobs"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["extensions"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]
```
这个自定义的ClusterRole包括了查看大多数资源的权限，以及对pods执行exec操作的权限。

应用该文件：
```bash
kubectl apply -f readonly-with-exec-clusterrole.yaml
```

2. 创建ServiceAccount
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: readonly-user
  namespace: kube-system  # 修改为需要命名空间
```
应用该文件：
```bash
kubectl apply -f readonly-user-serviceaccount.yaml
```

3. 创建ClusterRoleBinding
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: readonly-user-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: readonly-with-exec
subjects:
- kind: ServiceAccount
  name: readonly-user
  namespace: kube-system  # 与ServiceAccount的命名空间匹配
```
应用该文件：
```bash
kubectl apply -f readonly-user-clusterrolebinding.yaml
```

4. 获取ServiceAccount的Token

要让用户使用这个只读并支持exec的账号，需要获取ServiceAccount的token。首先，找到该ServiceAccount的secret：
```bash
kubectl get secrets -n kube-system | grep readonly-user
```
然后，查看该secret的详细信息以获取token：
```bash
kubectl describe secret readonly-user-token-abc123 -n kube-system
```
在输出中找到token字段并复制其值。
> 注意自己修改对应的namespace和secret的名称。

5. 使用Token认证
创建一个新的kubeconfig文件，例如readonly-user.kubeconfig，内容如下：
```yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: <ca.crt内容>  # 从上一步获取的ca.crt内容，进行base64编码
    server: https://<your-kubernetes-api-server>
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: readonly-user
  name: readonly-context
current-context: readonly-context
users:
- name: readonly-user
  user:
    token: <你的token>
```
> `ca.crt`的内容是从已经存在的kubeconfig文件中获取的，进行base64编码。

然后，使用新的kubeconfig文件：
```bash
KUBECONFIG=readonly-user.kubeconfig kubectl exec -it <pod-name> -- /bin/sh
```
此时就可以使用新的kubeconfig文件进行操作了。
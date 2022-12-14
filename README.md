<h1 align="center">Welcome to wechat-ai-assistant π</h1>

this repo forks from https://github.com/fuergaosi233/wechat-chatgpt, Enhanced:

- alidrive search feature.

<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-yellow.svg" />
  </a>
  <a href="https://twitter.com/fuergaosi" target="_blank">
    <img alt="Twitter: fuergaosi" src="https://img.shields.io/twitter/follow/fuergaosi.svg?style=social" />
  </a>
</p>

> Use ChatGPT On Wechat via wechaty  
English | [δΈ­ζζζ‘£](README_ZH.md)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/BHJD6L?referralCode=FaJtD_)
## π Feature

- [x] Use ChatGPT On Wechat via wechaty
- [x] Support OpenAI Accounts Pool
- [x] Support use proxy to login
- [x] Add conversation Support (Everyone will have their own session)
- [x] Add Dockerfile
- [x] Publish to Docker.hub
- [x] Add Railway deploy
- [x] Auto Reload OpenAI Accounts Pool
- [ ] Add sendmessage retry for 429/503

## Use with docker in Linux(recommended)

```sh
cp config.yaml.example config.yaml
# Change Config.yaml
# run docker command in Linux or WindowsPowerShell
docker run -d --name wechat-ai-assistant -v $(pwd)/config.yaml:/app/config.yaml holegots/wechat-ai-assistant:latest
# login with qrcode
docker logs -f wechat-ai-assistant
```
## Use with docker in Windows
```sh
# Create and modify config.yaml in the current directory
# run docker command in WindowsPowerShell
docker run -d --name wechat-ai-assistant -v $(pwd)/config.yaml:/app/config.yaml holegots/wechat-ai-assistant:latest
# In the Windows command line (cmd) environment, you may mount the current directory like this:
docker run -d --name wechat-ai-assistant -v %cd%/config.yaml:/app/config.yaml holegots/wechat-ai-assistant:latest
# login with qrcode
docker logs -f wechat-ai-assistant
```
## Upgrade Docker Image Version
```sh
docker pull holegots/wechat-ai-assistant:latest
docker stop wechat-ai-assistant
docker rm wechat-ai-assistant
docker run -d --name wechat-ai-assistant -v $(pwd)/config.yaml:/app/config.yaml holegots/wechat-ai-assistant:latest
```
## Install

```sh
npm install && poetry install
```

## Usage with manual

### Copy config

You need copy config file for setting up your project.

```sh
cp config.yaml.example config.yaml
```

### Get and config Openai account

> If you don't have this OpenAI account and you live in China, you can get it [here](https://mirror.xyz/boxchen.eth/9O9CSqyKDj4BKUIil7NC1Sa1LJM-3hsPqaeW_QjfFBc).

#### **AοΌUse account and password**

You need get OpenAI account and password.
Your config.yaml should be like this:

```yaml
chatGPTAccountPool:
  - email: <your email>
    password: <your password>
# if you hope only some keywords can trigger chatgpt on private chat, you can set it like this:
chatPrivateTiggerKeyword: ""
```

β οΈ Trigger keywords must appear in the first position of the received message.
β οΈ Pls make sure your network can log in to OpenAI, and if you fail to login in try setting up a proxy or using SessionToken.  
**Setup proxy:**

```sh
export http_proxy=<Your Proxy>
```

#### **B: Use Session Token**

If you cant use email and password to login your openai account or your network can't login, you can use session token. You need to follow these steps:

1. Go to https://chat.openai.com/chat and log in or sign up.
2. Open dev tools.
3. Open Application > Cookies.
   ![image](docs/images/session-token.png)
4. Copy the value for \_\_Secure-next-auth.session-token and save it to your config
   Your config.yaml should be like this:

```yaml
chatGPTAccountPool:
  - session_token: <your session_token>
```

### Start Project

```sh
npm run dev
```

If you are logging in for the first time, then you need to scan the qrcode.

## Author

π€ **holegots**

- Twitter: [@fuergaosi](https://twitter.com/fuergaosi)
- GitHub: [@fuergaosi233](https://github.com/fuergaosi233)

## π€ Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/fuergaosi233/wechat-ai-assistant/issues).

## Show your support

Give a β­οΈ if this project helped you!

# hyz-encript
cocoscreator加密混淆，基于2.4.5编写，理论上适用于引擎2.4.0-2.4.6，最重要是开源。
![截图](https://user-images.githubusercontent.com/11954247/141231612-5fe82cd1-a27a-4f16-ae22-d299c13b17a0.png)


功能：
- **web端**支持加密图片、text、json
- **native端**支持加密除音频外所有资源
- 支持文件名混淆

**加密思路:**
加密是最简单的异或加密，修改构建后的源码进行解密。native端是修改c++端CCFileUtil的文件读取函数，web端是修改cocos2d-jsb.js的download系列方法。

**文件名修改思路：**
提取文件名，重命名为文件名的md5码；然后下载资源前，先修改transformUrl函数，
将本地文件名同样算一遍md5，进行重定向；

**使用方式：**
必须先构建，目前支持jsb-link、web-mobile、web-desktop，然后再打开插件，选择对应的而构建方式，填上加密签名、秘钥，点击加密按钮即可。

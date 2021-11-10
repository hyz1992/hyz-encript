# hyz-encript
cocoscreator加密混淆，适用于引擎2.4，最重要是开源。

功能：加密文件并修改文件名，防止苹果发现敏感资源，防止4.3;

加密思路:
加密是最简单的异或加密，修改c++端CCFileUtil的文件读取函数进行解密；解密部分有借鉴商店的易盾加固（准确来说是看了这个才决定自己写一份的，代码得握在自己手上）

文件名修改思路：
提取文件名，重命名为文件名的md5码；然后修改jsb-adapter/jsb-engine.js的transformUrl函数，
将本地文件名同样算一遍md5，进行重定向；

目前重命名不包含js脚本

git地址：https://github.com/hyz1992/hyz-encript.git

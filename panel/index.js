let Fs = require('fs');
let Path = require('path');

// panel/index.js, this filename needs to match the one registered in package.json
Editor.Panel.extend({
  // css style for panel
  style: Fs.readFileSync(Editor.url('packages://hyz-encript/panel/index.css', 'utf8')),

  // html template for panel
  template: Fs.readFileSync(Editor.url('packages://hyz-encript/panel/index.html', 'utf8')),

  // element and variable binding
  $: {
    btn: '#btn',
    buildType:"#buildType",
    buildFloder:"#buildFloder",
    input_encriptKey: "#input_encriptKey",
    input_encriptSign: "#input_encriptSign",
    needMixFilename: "#needMixFilename",
    input_nameMixSign: "#input_nameMixSign",
  },

  /**是否要混淆文件名 */
  get _needMixFilename(){
    return this.$needMixFilename.value
  },
  /**混淆签名 */
  get _nameMixSign(){
    return this.$input_nameMixSign.value
  },
  /**加密签名 */
  get _encriptSign(){
    return this.$input_encriptSign.value
  },
  /**加密密码 */
  get _encriptKey(){
    return this.$input_encriptKey.value
  },
  /**构建目录 */
  get _buildFloder(){
    return this.$buildFloder.value
  },
  /**构建类型 */
  get _buildType(){
    return this.$buildType.value
  },

  // method executed when template and styles are successfully loaded and initialized
  ready () {
    this.recordPath = Editor.url('packages://hyz-encript/panel/record.json', 'utf8');
    
    // Editor.log('--------插件准备好',recordPath);
    let record = {};
    if(Fs.existsSync(this.recordPath)){
      record = JSON.parse(Fs.readFileSync(this.recordPath));
      
      if(record.encriptSign){
        this.$input_encriptSign.value = record.encriptSign;
      }
      if(record.encriptKey){
        this.$input_encriptKey.value = record.encriptKey;
      }
      if(record.buildType!=undefined){
        this.$buildType.value = record.buildType;
      }
      if(record.needMixFilename){
        this.$needMixFilename.value = record.needMixFilename;
      }
      this.$input_nameMixSign.disabled = !this._needMixFilename;
      if(record.nameMixSign&&this._needMixFilename){
        this.$input_nameMixSign.value = record.nameMixSign;
      }
      
      // Editor.log("有记录",record)
    }else{
      
    }

    this.$buildFloder.value = this._getBuildPath();

    this.$buildType.addEventListener('change',()=>{
      this.$buildFloder.value = this._getBuildPath();
    })

    this.$needMixFilename.addEventListener('change',()=>{
      this.$input_nameMixSign.disabled = !this._needMixFilename;
      if(record.nameMixSign&&this._needMixFilename){
        this.$input_nameMixSign.value = record.nameMixSign;
      }
    })
        
    this.$btn.addEventListener('confirm', this._doEncript.bind(this));
  },

  _doEncript(){
    let CLASS = require("./encripter")
    let record = {
      buildType : this._buildType,
      buildFloderPath : this._getBuildPath(),
      recordPath : this.recordPath,
      encriptKey : this._encriptKey,
      encriptSign : this._encriptSign,
      needMixFilename : this._needMixFilename,
      nameMixSign:this._nameMixSign,
    }
    let tool = new CLASS(record);
    tool.startBuild();
    
    Fs.writeFileSync(this.recordPath,JSON.stringify(record))
    Editor.log('--------------加密完成')
  },

  _getBuildPath(){
    let buildType = this._buildType;
    let assetsPath = Editor.url('db://assets','utf8');
    let web_desktopPath = Path.join(assetsPath,"../build/web-desktop");
    let web_mobilePath = Path.join(assetsPath,"../build/web-mobile");
    let jsb_linkPath = Path.join(assetsPath,"../build/jsb-link");
    if(buildType==0){
      return web_desktopPath;
    }else if(buildType==1){
      return web_mobilePath;
    }else if(buildType==2){
      return jsb_linkPath;
    }
  },

  // register your ipc messages here
  messages: {
    
  },

});

const OSS = require("ali-oss");
const { request }= require("urllib"); 
const Duplex = require("stream").Duplex;

const client = new OSS({  
  // yourRegion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
  region: 'oss-cn-beijing',
  // 阿里云账号AccessKey拥有所有API的访问权限，风险很高。强烈建议您创建并使用RAM用户进行API访问或日常运维，请登录RAM控制台创建RAM用户。
  accessKeyId: 'LTAI5tE3GB5jUbt6BFVVSwco',
  accessKeySecret: 'TjSGfj9Ba6WeFdpzgzyMEQbKLvuu1F',
  // 填写Bucket名称，例如examplebucket。
  bucket: 'css3-img',
});


const pikerNewObject = (obj, propertes) => {
  if(!obj || !propertes) {
    return obj;
  }
  return Object.keys(obj).reduce((acc,curKey)=>{
    if (propertes.includes(curKey) && typeof obj[curKey] !== 'undefined') {
      acc[curKey] = obj[curKey];
    }
    return acc;
  }, {})
}

const upload2tos = async (url = 'http://localhost:3000/app-cfeba0e3ee615a171569.js', tosPrefixPath='dev_test') => {
  let stream = new Duplex();
  const { data, res } = await request(url)
  stream.push(data);
  stream.push(null);
  const filepath = 'app-cfeba0e3ee615a171569.js';
  const fullpath = `${tosPrefixPath}/${filepath}`;
  const headers = pikerNewObject(res.headers, ['cache-control', 'expires'])
  console.log(headers);
  const r = await client.putStream(fullpath, stream, {
    headers, 
  })
  console.log(r)
  return `https://i.css3.io/${fullpath}`;
}

const isExistObject = async (name, options = {}) => {
  try {
    await client.head(name, options);
    return true;
  }
  catch (error) {
    if (error.code === 'NoSuchKey') {
      return false;
    }
    throw Error(error);
  }
}

module.exports = {
  upload2tos,
  isExistObject
}
upload2tos().then(res =>{
  console.log(res)
}).catch(e => console.log(e))

isExistObject('dev_test/aliyun-oss-sdk-6.16.0.min.js').then(res=> {
  console.log(`存在:`,res)
})


/*
用户信息数据库
*/

var mongodb = require('./db');
var connect=require('./connect');

function User(user){ 
  this.name = user.name; 
  this.password = user.password; 
  this.info = user.info; 
  this.stock = user.stock; 
  this.watch=user.watch; 
  this.beWatch=user.beWatch; 
  this.top=user.top; 
  this.admin=user.admin;
}

module.exports = User; 
User.prototype.save=function(callback){ 
  //callback 是执行玩保存后的回调函数
  var user = { 
    name: this.name, 
    password: this.password, 
    //下面内容在注册时不用填，在个人首页可以修改，所以先设置默认值和默认头像
    info:this.info||{
                      Spec: "还未填写",
                      interest: "还未填写",
                      pic:{
                        big:"/user/big/images.jpg",
                        small:"user/small/images.jpg"
                      },
                      email:"还未填写"
                    },
    stock:[],
    watch:[],
    beWatch:[],
    top:0,
    admin:3
  }; 
  //打开数据库
  //连接数据库中的名为user的表，没有就创建
  global.db.collection('user',function(err,collection){ 
    //连接失败会将错误信息返回给回调函数，并且关闭数据库连接
    if(err){ 
      return callback(err); 
    } 
     //插入新的数据
    collection.insert(user,{safe: true},function(err,result){        
      //如果错误err有错误信息，将err和user返回给回调函数
      callback(err, user);//成功！返回插入的用户信息 
    }); 
  });
};
//读取用户信息 
User.get = function(name, callback){ 
  //读取 users 集合 
  global.db.collection('user', function(err, collection){ 
    if(err){  
      return callback(err); 
    } 
    //查找用户名 name 值为 name文档 
    collection.findOne({name: name},function(err, doc){  
      if(doc){ 
        var user = new User(doc); 
        callback(err, user);//成功！返回查询的用户信息 
      } else { 
        callback(err, null);//失败！返回null 
      } 
    }); 
  });
};

//点击股票关注，更新表
User.stockUp=function(db,watchName,uid,add,callback){
  global.db.collection('user',function(err,collection){
    if(err){     
      return callback(err); 
    }
    if(add){
      collection.update({name:watchName.name},{$push:{stock:uid}},function(err,items){
        callback(err,items);
      });
    }else{
      collection.update({name:watchName.name},{$pull:{stock:uid}},function(err,items){
        callback(err,items);
      });
    }
  });
};

//关注用户
User.watch=function(wat,req,name,callback){
  //打开数据库
  var fromName=req.session.user.name;
  var watch=req.session.user.watch;
  var toName=name;
  //读取 users 集合 
  global.db.collection('user', function(err, collection){ 
    if(err){  
      return callback(err); 
    }
    if(wat){//wat为true表示加关注
      //判断下是否已经关注过
      for(var i=0,l=watch.length;i<l;i++){
        if(watch[i]==toName){
          
          var message="您已经关注该用户";
          callback(err,{ok:false,message:message});
          return;
        }
      }
      collection.update({name:toName},{$inc:{top:1},$push:{beWatch:fromName}},function(err,items){
        if(err){      
          return callback(err); 
        } 
        collection.update({name:fromName},{$push:{watch:toName}},function(err,items){
          if(err){       
            return callback(err); 
          } 
          callback(err,{ok:true});
        });
      });
    }else{
      collection.update({name:toName},{$inc:{top:-1},$pull:{beWatch:fromName}},function(err,items){
        if(err){         
          return callback(err); 
        }
        collection.update({name:fromName},{$pull:{watch:toName}},function(err,items){
          if(err){      
            return callback(err); 
          } 
          callback(err,items);
        });
      });
    }
  });
};

User.isWatch=function(myName,name,callback){
  //读取 users 集合 
  global.db.collection('user', function(err, collection){
    if(err){   
      return callback(err); 
    }
    //查找用户名myName是否已经关注过name
    collection.find({name:name,beWatch:myName},function(err,items){
      if(err){  
        return callback();
      }
      items.toArray(function(err,arr){ 
        if(arr.length>0){
          callback(true);
        }else{
          callback(false);
        }
      });
    });
  });
};

User.watchPage=function(name,callback){
  //读取 users 集合 
  global.db.collection('user', function(err, collection){ 
    if(err){  
      return callback(err); 
    }
    //查找name关注的人
    collection.findOne({name: name},function(err, doc){ 
      if(doc){ 
        var user = new User(doc); 
        callback(err, user);//成功！返回查询的用户信息 
      } else {
        callback(err, null);//失败！返回null 
      } 
    }); 
  }); 
};

User.hotPeople=function(callback){
  global.db.collection('user',function(err,collection){
    if(err){ 
      return callback(err); 
    }
    collection.find().sort({top:-1}).limit(10).toArray(function(err,items){
      if(err){
        return callback(err); 
      }
      if(!!items){//存在
        callback(items);
      }else{
        callback(null);
      }
    });
  });
};

User.setInfo=function(name,info,callback){
  //读取 users 集合 
  global.db.collection('user', function(err, collection){ 
    if(err){ 
      return callback(err); 
    } 
    //查找用户名 name 值为 name文档 
    collection.update({name:name},{$set:{info:info}},function(err,items){
      callback(err,items);
    });
  });  
};

User.password=function(name,old,newP,callback){
  //读取 users 集合 
  global.db.collection('user', function(err, collection){ 
    if(err){ 
      return callback(err); 
    } 
    //查找用户名 name 值为 name文档 
    collection.findOne({name: name},function(err, doc){ 
      if(doc){ 
        if(doc.password==old){
          collection.update({name:name},{$set:{password:newP}},function(err,items){
            
            if(err){
              callback(err);//失败！返回null
            }
            callback("修改成功");
          });
        }else{
          callback("原始密码不正确");
        }
      } else {
        callback(err);//失败！返回null 
      } 
    }); 
  }); 
};
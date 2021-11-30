const Router=require("koa-router");
const {redis,redis_client} = require('../../utils/redis'); // 使用为redis bluebird 变为异步
// 引入避免超卖lua脚本
const { stock, lock, unlock } = require('./utils/scripts');  // lua 保证为原子操作
const {  v4 : uuidv4 } =require('uuid')
const route=new Router({
    prefix:'/con'
})
let n=1;
let userId="999"
route.get('/',async (ctx)=>{
    // 手动模拟用户购买的商品
    // redis_client.hset("999",
    //     "amount","10",
    //     "start_time", '2020-06-20 00:00:00',
    //     "end_time", '2023-06-20 00:00:00',
    //     "is_valid", "1",
    //     "comment", '...',
    //   )
    // return false
    // win http_load -p 50 -s 10 -r 10 -f 400 D:\项目\spaceX\auth_nodes/urls.txt 并发测试
    const lockKey = `${n++}${userId}`; // 锁的key有用户id和商品id组成
    const uuid = uuidv4();
    const expireTime = "40"; // 锁存在时间为当前时间和活动结束的时间差
    const tryLock = await redis_client.evalAsync(lock, 2, lockKey, 'releaseTime', uuid, expireTime);// 添加用户购买
    try{
        if (tryLock===1) {
            let key=userId;
            const count = await redis_client.evalAsync(stock, 2, key, 'amount', '', '');
            console.log(count,'库存数量为');
        }
    }catch(e){
        await redis.eval(unlock, 1, lockKey, uuid);
        return "该产品已经卖完了！"
    }
    ctx.code=200
    ctx.body={

    }
})
module.exports=route

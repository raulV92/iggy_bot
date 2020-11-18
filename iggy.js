
// Global variables:
const fs = require('fs');
const five = require('johnny-five');
//const { resolve } = require('path');
const Telegraf = require('telegraf');
const botData = fs.readFileSync('../rascunhos/bot_data.json');
const botJson = JSON.parse(botData);

const tkn= botJson.iggyToken;
const users=botJson.chatID;

var iggy=new Telegraf(tkn);  // <------ IGGY!!!!

// Nano:   ///////////////////////////////////////////////
var map_sensor={}
    map_sensor[users[0]]=839;
    map_sensor[users[1]]=820;
    map_sensor[users[2]]=733;
    //"s1-s2":576

var nano= new five.Board();
nano.on("ready",nano_init);

var puertas;
var  alarmas=[];


function nano_init(){
    console.log("inicio Nano");
    puertas=new five.Pin("A1");
    alarmas.push(new five.Pin(5));
    alarmas[0].low();
    alarmas.push(new five.Pin(2));
    alarmas[1].low();
    alarmas.push(new five.Pin(3));
    alarmas[2].low();


    ciclo();
}

function ciclo(){  // Main loop:
    console.log("Analogico: " + puertas.value);
    //for(let i =0;i<watch.length;i++){
    process_sensor(puertas.value);
    check_panic();
    //}
    setTimeout(ciclo,333);

}


function process_sensor(lectura){
    let tol=5;

    if(map_sensor[users[0]]-tol<lectura && lectura< map_sensor[users[0]]+tol && deptos[users[0]].watch){
        
        deptos[users[0]].alarm=true;
    }else if(map_sensor[users[2]]-tol<lectura && lectura< map_sensor[users[2]]+tol&& deptos[users[2]].watch){
        deptos[users[2]].alarm=true;
    }else if(map_sensor[users[1]]-tol<lectura && lectura< map_sensor[users[1]]+tol&& deptos[users[1]].watch){
        deptos[users[1]].alarm=true;
    }
}

function check_panic(){
    
    for(let k=0;k<users.length;k++){
        //console.log('rev panic: '+deptos[users[0]].panic)
        if(deptos[users[k]].panic){
            alarmas[k].high();
        }else{
            alarmas[k].low();
        }
        //
    }
}

// department class ??  ???????????????????????????????????
class Dpto{
    constructor(chatId,pin_in){
        this.id=chatId;
        this.sensor=pin_in;
        this.watch=false;
        this.alarm=false;
        this.panic=false;
    }

    chWatch(){
        // 
        if(this.watch==false){
            this.watch=true;
            iggy.telegram.sendMessage(this.id, "Watch Activado");
        }else if(this.watch==true){
            this.watch=false;
            this.alarm=false;
            iggy.telegram.sendMessage(this.id, "Watch DES-Activado");
        }
    }

    chAlarm(){
        //console.log(this)
        if(this.watch && this.alarm){            
            iggy.telegram.sendMessage(this.id, "Sensor Abierto \n/watch para desactivar"+
                                                "\npara activar sirena presiona /panic"); 

        }


    }

}

var deptos={}
for (let k=0;k<users.length;k++){
        
    deptos[users[k]]= new Dpto(users[k],k)
    
}

console.log(deptos)

function notify(){
    for(let k=0;k<users.length;k++){
        //console.log(k)
        //console.log(deptos[users[k]]);
        deptos[users[k]].chAlarm();
    }
    console.log("notify loop...")
    //console.log('limite:' +deptos)
}

setInterval(notify,5000);
// Telegraf  |--------------------------------------------|

function to_database(ctx){
    let dd= new Date((ctx.message.date-6*60*60)*1000) // extrano desfase de horas

    let user_id=ctx.chat.id;
    let user_name=ctx.chat.first_name;
    console.log(user_id);
    console.log(user_name);
    console.log(dd);
};


function not_valid(ctx){
    ctx.reply("Desconocido")
}

iggy.start((ctx) => {
    if(deptos[ctx.chat.id]){
        
        console.log(deptos[ctx.chat.id])
        console.log(ctx.chat)
        ctx.reply(`Hola ${ctx.chat.first_name}! presiona en "help" para ver comandos disponobles \n /help`)
    }else{not_valid(ctx);}
})
iggy.help((ctx) => {
    if(deptos[ctx.chat.id]){
        let ayuda= fs.readFileSync('bot_help.txt').toString();
        //console.log(ayuda);
        //console.log(ctx);
        ctx.reply(ayuda);
    }else{not_valid(ctx);}
})
iggy.command('watch',(ctx) => {
    if(deptos[ctx.chat.id]){
        
        deptos[ctx.chat.id].chWatch()
        //console.log(deptos[ctx.chat.id])
        to_database(ctx);

    }else{not_valid(ctx);}
})
iggy.command('status',(ctx) => {
    if(deptos[ctx.chat.id]){

        ctx.reply('/watch:\t'+deptos[ctx.chat.id].watch+
                '\n/alarm:\t'+deptos[ctx.chat.id].alarm+
                '\n/panic:\t'+deptos[ctx.chat.id].panic)
        

    }else{not_valid(ctx); }
})
iggy.command('panic',(ctx)=>{
    if(deptos[ctx.chat.id]){
        if(!deptos[ctx.chat.id].panic){
            deptos[ctx.chat.id].panic=true;
            ctx.reply('Panic encendido '+
                    '\npresiona /panic para apagar')
        }else if(deptos[ctx.chat.id].panic){
            deptos[ctx.chat.id].panic=false;
            ctx.reply('Panic apagado');

        }
    }else{not_valid(ctx);}

})
  

iggy.launch();

// Constantes para la creación del servidor:
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const puerto = 3000;

const claveSecreta = 'hola23*'

app.use(bodyParser.json());
app.use(express.json());
//ROUTER 
const rutaPredefinida = express.Router();// ruta predefinida para evitar la repetición de codigo
app.use('/api', rutaPredefinida);


async function tenerUsuarios() { // middleware token para la autenticación de los usuarios
    try {
        const data = await fs.readFile('usuarios.json', 'utf-8');// ingresa a usuarios.json y lee todo su contenido
        return JSON.parse(data);
    }// retorna todo lo que leyó
    catch (error) {
        console.error('Error al leer usuarios.json:', error.message)
        return [];
    }
}

async function guardarUsuarios(usuarios) {
    await fs.writeFile('usuarios.json', JSON.stringify(usuarios, null, 2)); /*escribe en el archivo.json 
    cuando hay una tarea nueva, convierte dichas tareas en cadenas de texto y se le agregan espacios para que sea más legible y facil de comprender*/}

//MIDDLEWARE
function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({ message: 'Acceso denegado, token requerido' });
    }

    const token = authHeader.split(' ')[1]; // Extrae solo el token sin "Bearer"
    
    jwt.verify(token, claveSecreta, (err, usuario) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = usuario; // Guarda los datos del usuario en la request
        next();
    });
}




//CREACIÓN DE RESGITRO Y LOGIN

rutaPredefinida.post('/register', async (req, res) => {
    const{nombreUsuario,  contraseña}=req.body;

    if(!nombreUsuario || !contraseña ){// si al ingresar los datos del registro hay campos incompletos mandará una advertencia
        return res.status(400).json({mensaje:'El registro esta incompleto, recuerda : nombreUsuario, contraseña'})
    }
    let usuarios= await tenerUsuarios();//obtiene todos los usuarios guardados en tenerUsuarios

    const usuarioExiste= usuarios.find( usuariu=>usuariu.nombreUsuario===nombreUsuario);// hace una comparación de el nombre de cada uno de los usuarios, con los ya existentes
    if(usuarioExiste){//, para luego, si se ecuentra un usuario igual, mande un error ya que ese usuario se encuentra ocupado
        return res.status(400).json({message:'El usuario ya existe'});
    }

    const encriptSeña= await bcrypt.hash(contraseña,10);// toma la contraseña y la encripta con ayuda de la funcion bcrypt
    usuarios.push({nombreUsuario, contraseña:encriptSeña});// hace una adición al archivo de "usuarios" del nuevo usuario
    
    await guardarUsuarios(usuarios);

    res.status(201).json({message: 'Usuario creado'});
})

rutaPredefinida.post('/login', async (req, res) => {
    const {nombreUsuario,contraseña}= req.body;

    if (!nombreUsuario||!contraseña){
        return res.status(400).json({message:'Nombre de usuario o contraseña estan ausentes'});
    }
    let usuarios= await tenerUsuarios();

    const usuario= usuarios.find( usuariu=>usuariu.nombreUsuario===nombreUsuario);
     
    if(!usuario){
        return res.status(400).json({message: 'Usuario no encontrado'});

    }

    const validacionContraseña= await bcrypt.compare(contraseña, usuario.contraseña);
    if(!validacionContraseña){
        return res.status(400).json({message:'Su contraseña es incorrecta'})
    }

    const token=jwt.sign({nombreUsuario},claveSecreta,{expiresIn:"1h"});
    res.json({message:'Bienvenido', token});

});

rutaPredefinida.get('/usuarios', autenticarToken, async(req,res)=>{

    const usuarios= await tenerUsuarios();
    res.json(usuarios.map(usuariu=>({nombreUsuario: usuariu.nombreUsuario})));
});





//RUTAS
// ruta principal para ver que funciona correctamente el puerto
rutaPredefinida.get('/home', autenticarToken, async (req, res) => {
    res.send('<h1> Bienvenido a la To-Do-List <h1>'
        + '<h4> En esta lista tu podrás ingresar cualquier tipo de tareas <h4>'
        + '<h4> Ingresa a la ruta TAREAS <h4>');
});


fs.readFile('tareas.json', 'utf8') // verificar que el archivo tareas.json pueda ser leído
    .then(data => {
        console.log('contenido del archivo:', data);
    })
    .catch(err => {
        console.error('Error al leer el archivo:', err);
    })

async function tenerTareas() {
    const data = await fs.readFile('tareas.json', 'utf-8');// ingresa a tareas.json y lee todo su contenido
    return JSON.parse(data);// retorna todo lo que leyó
}
//  agregar la tarea al JSON
async function guardarTareas(tareas) {
    await fs.writeFile('tareas.json', JSON.stringify(tareas, null, 2)); /*escribe en el archivo.json 
    cuando hay una tarea nueva, convierte dichas tareas en cadenas de texto y se le agregan espacios para que sea más legible y facil de comprender*/
}




// Ver todos los elementos del archivo JSON tareas.json READ
// FUNCIONA EN POSTMAN
rutaPredefinida.get('/todastareas',autenticarToken, async (req, res) => {
    try {
        let tareas = await tenerTareas(); //se lee la información que contiene el archivo "tareas.json"
        res.json(tareas);// ya teniendolos se devuelven como una respuesta a la petición del usuario
    }
    catch (error) {
        res.status(500).json({ message: 'Error al leer las tareas' }); // en caso de que algo salga mal, se imprimira este error
    }

})

// CREATE una nueva tarea y que se guarde en el archivo tareas.json

rutaPredefinida.post('/ingresartarea', autenticarToken, async (req, res) => {
    try {

        const { id, titulo, descripcion } = req.body;

        if (!id || !titulo || !descripcion) {// validación para que no falte ninguno de los campos
            return res.status(400).json({ message: 'la tarea no fue agregada porque faltan campos, recuerde:(id, titulo, descripcion)' });
        }

        if (typeof id !== "number" || id <= 0) {// validar que sea de tipo numero y que no sea menor a 0
            return res.status(400).json({ message: 'El tipo de dato del id es incorrecto' });
        }

        let tareas = await tenerTareas();// se obtienen las tareass
        const idExiste = tareas.find(tarea => tarea.id === id); // si la tarea que esta almacenada en "tareas" su id(tarea.id) conicide con el id nuevo 
        // mandará un error
        if (idExiste) {
            return res.status(400).json({ message: 'El ID de tu tarea ya existe' });// mensaje de error
        }

        const nuevaTarea = { id, titulo, descripcion };// se almacenan los datos de la nueva tarea en la variable "nuevaTarea"
        tareas.push(nuevaTarea);// se agrega al final del archivo la nueva tarea

        await guardarTareas(tareas);// se actualiza el archivo ya con los datos nuevos
        return res.status(201).json({ message: `Se agregó correctamente la tarea con título: ${titulo}` });
    }//.json convierte la información en tipo json

    catch (error) {
        return res.status(500).json({ message: 'No se agrego la tarea ya que hay un error' });
    }
})

//UPDATE actualizar la información de las tareas
rutaPredefinida.put('/:id',autenticarToken, async (req, res) => {
    try {
        let tareaId = parseInt(req.params.id);// obtiene el id que se muestra en la URL
        let datosNuevos = req.body;// Datos d la nueva tarea

        if (!datosNuevos.titulo || typeof datosNuevos.titulo !== 'string' || datosNuevos.titulo.trim === '') { // se asegura de que haya datos en el titulo
            return res.status(400).json({ message: 'La tarea debe tener un titulo' })
        }

        if (!datosNuevos.descripcion || typeof datosNuevos.descripcion !== 'string' || datosNuevos.descripcion.trim === '') {// se asegura de que haya datos en la descripcion
            return res.status(400).json({ message: 'La tarea debe tener una descripción' })
        }



        let tareas = await tenerTareas();//Accede a los datos que hay hasta ahora en tareas.json
        let tareaABuscar = tareas.findIndex((task) => task.id === tareaId); // busca el id d la tarea
        if (tareaABuscar === -1) {// si el id de la URL no se encuentrá en el tareas.json
            return res.status(404).json({ message: 'El id de la tarea no se encontró' });
        }

        const tituloExistente = tareas.some(task => task.titulo === datosNuevos.titulo && task.id !== tareaId);//some itera el arreglo de tareas, para luego hacer una comparación con cada una de las tareas segun su Id y  verifica que no haya tareas con el mismo titulo
        if (tituloExistente) {
            return res.status(400).json({ message: 'Ya hay una tarea con el mismo titulo, ingrese uno distinto' });
        }

        tareas[tareaABuscar] = { ...tareas[tareaABuscar], ...datosNuevos };// actualizacion de los datos

        await guardarTareas(tareas); // almacena los nuevos datos
        res.status(200).json({
            message: 'La tarea se ha actualizado', // manda un mensaje d q se actualizo
            tareaActualizada: tareas[tareaABuscar] // enseña la tarea actualizada

        });
    }// responde con la tarea actualizada
    catch (error) {
        res.status(500).json({ message: 'No se pudo actualizar la tarea, hay un problema ' })
    }

})

//DELETE borrar una tarea
rutaPredefinida.delete('/:id', autenticarToken,async (req, res) => {
    try {
        let tareaId = parseInt(req.params.id);
        let tareas = await tenerTareas();
        let tareaABuscar = tareas.findIndex((task) => task.id === tareaId);
        if (tareaABuscar === -1) {// si el id de la URL no se encuentrá en el tareas.json
            return res.status(404).json({ message: 'El id de la tarea no se encontró' });
        }
        tareas.splice(tareaABuscar, 1);
        await guardarTareas(tareas);
        res.status(200).json({ message: `La tarea  con ID:${tareaId} se ha eliminado` });
    } catch (error) {
        res.status(500).json({ message: 'Estamos teniendo problemas para eliminar la tarea' })
    };
})


app.use((req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Error interno del servidor'});
});



app.listen(puerto, () => {
    console.log(`Servidor corriendo en el puerto http://localhost:${puerto}`);
});



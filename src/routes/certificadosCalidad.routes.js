const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
const jwtDecode = require("jwt-decode");
const certificadosCalidad = require("../models/certificadosCalidad");
const { map } = require("lodash");

// Registro de las compras
router.post("/registro", verifyToken, async (req, res) => {
    const { folio } = req.body;
    //console.log(folio)

    // Inicia validacion para no registrar acuses de recibo con el mismo folio
    const busqueda = await certificadosCalidad.findOne({ folio });

    if (busqueda && busqueda.folio === folio) {
        return res.status(401).json({ mensaje: "Ya existe un certificado con este folio" });
    } else {
        const certificado = certificadosCalidad(req.body);
        await certificado
            .save()
            .then((data) =>
                res.status(200).json(
                    {
                        mensaje: "Registro exitoso del certificado", datos: data
                    }
                ))
            .catch((error) => res.json({ message: error }));
    }
    //
});

// Obtener todos las compras
router.get("/listar", verifyToken, async (req, res) => {
    await certificadosCalidad
        .find()
        .sort({ _id: -1 })
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

// Listar paginando los elementos de las compras
router.get("/listarPaginando", async (req, res) => {
    const { pagina, limite } = req.query;
    //console.log("Pagina ", pagina , " Limite ", limite)

    const skip = (pagina - 1) * limite;

    await certificadosCalidad
        .find()
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limite)
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

// Obtener el total de registros de la colección
router.get("/total", verifyToken, async (req, res) => {
    await certificadosCalidad
        .find()
        .count()
        .sort({ _id: -1 })
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

// Obtener una compras
router.get("/obtener/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    //console.log("buscando")
    await certificadosCalidad
        .findById(id)
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

// Obtener los datos de una compra segun el folio
router.get("/obtenerDatosCertificado/:folio", verifyToken, async (req, res) => {
    const { folio } = req.params;

    await certificadosCalidad
        .findOne({ folio })
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

// Obtener el numero de folio de la compra actual
router.get("/obtenerNoCertificado", verifyToken, async (req, res) => {
    const certificado = await certificadosCalidad.find().count();
    if (certificado === 0) {
        res.status(200).json({ noCertificado: "CFC-1" })
    } else {
        const ultimoCertificado = await certificadosCalidad.findOne().sort({ _id: -1 });
        const tempFolio1 = ultimoCertificado.folio.split("-")
        const tempFolio = parseInt(tempFolio1[1]) + 1;
        res.status(200).json({ noCertificado: "CFC-" + tempFolio.toString().padStart(1, 0) })
    }
});

// Obtener el numero de folio de la compra actual
router.get("/obtenerItem", verifyToken, async (req, res) => {
    const registroCertificado = await certificadosCalidad.find().count();
    if (registroCertificado === 0) {
        res.status(200).json({ item: 1 });
    } else {
        const [ultimoItem] = await certificadosCalidad
            .find({})
            .sort({ item: -1 })
            .limit(1);
        const tempItem = parseInt(ultimoItem.item) + 1;
        res.status(200).json({ item: tempItem });
    }

});

// Borrar una compra
router.delete("/eliminar/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    await certificadosCalidad
        .remove({ _id: id })
        .then((data) => res.status(200).json({ mensaje: "Certificado eliminado" }))
        .catch((error) => res.json({ message: error }));
});

// Para cambiar el estado de la compra
router.put("/actualizarEstado/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    await certificadosCalidad
        .updateOne({ _id: id }, { $set: { estado } })
        .then((data) => res.status(200).json({ mensaje: "Estado del certificado actualizado" }))
        .catch((error) => res.json({ message: error }));
});

// Actualizar datos de orden de compra
router.put("/actualizar/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { fecha, noOrdenInterna, tamañoLote, cliente, descripcion, numeroParte, especificacionInforme, revisionAtributos, resultadoDimensional, observacionesResultados, equipoMedicion, referencia, realizo, correo } = req.body;
    await certificadosCalidad
        .updateOne({ _id: id }, { $set: { fecha, noOrdenInterna, tamañoLote, cliente, descripcion, numeroParte, especificacionInforme, revisionAtributos, resultadoDimensional, observacionesResultados, equipoMedicion, referencia, realizo, correo } })
        .then((data) => res.status(200).json({ mensaje: "Informacion del certificado actualizada", datos: data }))
        .catch((error) => res.json({ message: error }));
});

async function verifyToken(req, res, next) {
    try {
        if (!req.headers.authorization) {
            return res.status(401).send({ mensaje: "Petición no Autorizada" });
        }
        let token = req.headers.authorization.split(' ')[1];
        if (token === 'null') {
            return res.status(401).send({ mensaje: "Petición no Autorizada" });
        }

        const payload = await jwt.verify(token, 'secretkey');
        if (await isExpired(token)) {
            return res.status(401).send({ mensaje: "Token Invalido" });
        }
        if (!payload) {
            return res.status(401).send({ mensaje: "Petición no Autorizada" });
        }
        req._id = payload._id;
        next();
    } catch (e) {
        //console.log(e)
        return res.status(401).send({ mensaje: "Petición no Autorizada" });
    }
}

async function isExpired(token) {
    const { exp } = jwtDecode(token);
    const expire = exp * 1000;
    const timeout = expire - Date.now()

    if (timeout < 0) {
        return true;
    }
    return false;
}

module.exports = router;

/*=========================================================
    PROYECTO: SISTEMA DE GESTIÓN CAFÉ ARTESANAL
    PARTE 1
    Base de datos + Tablas Principales
=========================================================*/

DROP DATABASE IF EXISTS cafe_artesanal;
CREATE DATABASE cafe_artesanal
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE cafe_artesanal;

SET FOREIGN_KEY_CHECKS=0;

/*=========================================================
TABLA ROLES
=========================================================*/

CREATE TABLE roles(
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(150)
)ENGINE=InnoDB;

/*=========================================================
TABLA CLIENTES
=========================================================*/

CREATE TABLE clientes(
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    cedula VARCHAR(15) UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(120) UNIQUE,
    direccion VARCHAR(200),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('ACTIVO','INACTIVO') DEFAULT 'ACTIVO'
)ENGINE=InnoDB;

/*=========================================================
TABLA CATEGORIAS
=========================================================*/

CREATE TABLE categorias(
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    estado ENUM('ACTIVA','INACTIVA') DEFAULT 'ACTIVA'
)ENGINE=InnoDB;

/*=========================================================
TABLA MÉTODOS DE PAGO
=========================================================*/

CREATE TABLE metodos_pago(
    id_metodo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    estado ENUM('ACTIVO','INACTIVO') DEFAULT 'ACTIVO'
)ENGINE=InnoDB;

/*=========================================================
TABLA PROVEEDORES
=========================================================*/

CREATE TABLE proveedores(
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    empresa VARCHAR(120) NOT NULL,
    representante VARCHAR(120),
    telefono VARCHAR(20),
    correo VARCHAR(120),
    direccion VARCHAR(200),
    estado ENUM('ACTIVO','INACTIVO') DEFAULT 'ACTIVO'
)ENGINE=InnoDB;

/*
TABLA SUCURSALES*/

CREATE TABLE sucursales(
    id_sucursal INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200),
    telefono VARCHAR(20),
    estado ENUM('ACTIVA','INACTIVA') DEFAULT 'ACTIVA'
)ENGINE=InnoDB;
/*TABLAS RELACIONADAS*/

/*
TABLA USUARIOS*/

CREATE TABLE usuarios(
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_rol INT NOT NULL,
    id_sucursal INT NOT NULL,

    usuario VARCHAR(50) NOT NULL UNIQUE,
    correo VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    estado ENUM('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',

    CONSTRAINT fk_usuario_cliente
        FOREIGN KEY(id_cliente)
        REFERENCES clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY(id_rol)
        REFERENCES roles(id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_usuario_sucursal
        FOREIGN KEY(id_sucursal)
        REFERENCES sucursales(id_sucursal)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)ENGINE=InnoDB;


/*=========================================================
TABLA PRODUCTOS
=========================================================*/

CREATE TABLE productos(

    id_producto INT AUTO_INCREMENT PRIMARY KEY,

    id_categoria INT NOT NULL,
    id_proveedor INT NOT NULL,

    codigo VARCHAR(30) NOT NULL UNIQUE,

    nombre VARCHAR(120) NOT NULL,

    descripcion TEXT,

    imagen_url VARCHAR(255),

    precio_compra DECIMAL(10,2) NOT NULL,

    precio_venta DECIMAL(10,2) NOT NULL,

    stock INT NOT NULL DEFAULT 0,

    stock_minimo INT NOT NULL DEFAULT 5,

    unidad VARCHAR(20) DEFAULT 'Unidad',

    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    estado ENUM('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',

    CONSTRAINT fk_producto_categoria
        FOREIGN KEY(id_categoria)
        REFERENCES categorias(id_categoria)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_producto_proveedor
        FOREIGN KEY(id_proveedor)
        REFERENCES proveedores(id_proveedor)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)ENGINE=InnoDB;


/*=========================================================
TABLA INVENTARIO
=========================================================*/

CREATE TABLE inventario(

    id_inventario INT AUTO_INCREMENT PRIMARY KEY,

    id_producto INT NOT NULL,

    entradas INT DEFAULT 0,

    salidas INT DEFAULT 0,

    existencia INT DEFAULT 0,

    ultima_actualizacion TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventario_producto
        FOREIGN KEY(id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE CASCADE

)ENGINE=InnoDB;


/*=========================================================
TABLA COMPRAS
=========================================================*/

CREATE TABLE compras(

    id_compra INT AUTO_INCREMENT PRIMARY KEY,

    id_proveedor INT NOT NULL,

    id_usuario INT NOT NULL,

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    subtotal DECIMAL(10,2) DEFAULT 0,

    iva DECIMAL(10,2) DEFAULT 0,

    total DECIMAL(10,2) DEFAULT 0,

    observacion VARCHAR(250),

    estado ENUM('PENDIENTE','PAGADA','ANULADA')
    DEFAULT 'PENDIENTE',

    CONSTRAINT fk_compra_proveedor
        FOREIGN KEY(id_proveedor)
        REFERENCES proveedores(id_proveedor)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_compra_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)ENGINE=InnoDB;
/*=========================================================
        PARTE 3
        VENTAS - DETALLES - PAGOS
=========================================================*/

/*=========================================================
TABLA VENTAS
=========================================================*/

CREATE TABLE ventas(

    id_venta INT AUTO_INCREMENT PRIMARY KEY,

    id_cliente INT NOT NULL,

    id_usuario INT NOT NULL,

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,

    iva DECIMAL(10,2) NOT NULL DEFAULT 0,

    descuento DECIMAL(10,2) DEFAULT 0,

    total DECIMAL(10,2) NOT NULL,

    estado ENUM('PENDIENTE','PAGADA','ANULADA')
    DEFAULT 'PAGADA',

    CONSTRAINT fk_venta_cliente
        FOREIGN KEY(id_cliente)
        REFERENCES clientes(id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_venta_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)ENGINE=InnoDB;


/*=========================================================
TABLA DETALLE_VENTA
=========================================================*/

CREATE TABLE detalle_venta(

    id_detalle INT AUTO_INCREMENT PRIMARY KEY,

    id_venta INT NOT NULL,

    id_producto INT NOT NULL,

    cantidad INT NOT NULL,

    precio_unitario DECIMAL(10,2) NOT NULL,

    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_detalleventa_venta
        FOREIGN KEY(id_venta)
        REFERENCES ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_detalleventa_producto
        FOREIGN KEY(id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)ENGINE=InnoDB;


/*=========================================================
TABLA DETALLE_COMPRA
=========================================================*/

CREATE TABLE detalle_compra(

    id_detalle_compra INT AUTO_INCREMENT PRIMARY KEY,

    id_compra INT NOT NULL,

    id_producto INT NOT NULL,

    cantidad INT NOT NULL,

    costo_unitario DECIMAL(10,2) NOT NULL,

    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_detallecompra_compra
        FOREIGN KEY(id_compra)
        REFERENCES compras(id_compra)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_detallecompra_producto
        FOREIGN KEY(id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)ENGINE=InnoDB;


/*=========================================================
TABLA PAGOS
=========================================================*/

CREATE TABLE pagos(

    id_pago INT AUTO_INCREMENT PRIMARY KEY,

    id_venta INT NOT NULL,

    id_metodo INT NOT NULL,

    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,

    monto DECIMAL(10,2) NOT NULL,

    referencia VARCHAR(100),

    estado ENUM('PENDIENTE','CONFIRMADO','RECHAZADO')
    DEFAULT 'CONFIRMADO',

    CONSTRAINT fk_pago_venta
        FOREIGN KEY(id_venta)
        REFERENCES ventas(id_venta)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_pago_metodo
        FOREIGN KEY(id_metodo)
        REFERENCES metodos_pago(id_metodo)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)ENGINE=InnoDB;


/*=========================================================
TABLA MOVIMIENTO_INVENTARIO
=========================================================*/

CREATE TABLE movimiento_inventario(

    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,

    id_producto INT NOT NULL,

    id_usuario INT NOT NULL,

    tipo ENUM('ENTRADA','SALIDA') NOT NULL,

    cantidad INT NOT NULL,

    motivo VARCHAR(150),

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mov_producto
        FOREIGN KEY(id_producto)
        REFERENCES productos(id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_mov_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

)ENGINE=InnoDB;
/*=========================================================
        PARTE 4
        DATOS INICIALES DEL SISTEMA
=========================================================*/

/*=========================================================
ROLES
=========================================================*/

INSERT INTO roles(nombre,descripcion) VALUES
('Administrador','Acceso total al sistema'),
('Usuario','Acceso limitado al sistema');


/*=========================================================
SUCURSAL PRINCIPAL
=========================================================*/

INSERT INTO sucursales
(nombre,direccion,telefono,estado)
VALUES
(
'Matriz',
'Dirección Principal',
'0999999999',
'ACTIVA'
);


/*=========================================================
MÉTODOS DE PAGO
=========================================================*/

INSERT INTO metodos_pago
(nombre,descripcion)
VALUES
('Efectivo','Pago en efectivo'),
('Transferencia','Transferencia bancaria'),
('Tarjeta Débito','Pago con tarjeta débito'),
('Tarjeta Crédito','Pago con tarjeta crédito'),
('PayPhone','Pago mediante PayPhone'),
('PayPal','Pago mediante PayPal');


/*=========================================================
CATEGORÍAS
=========================================================*/

INSERT INTO categorias(nombre,descripcion)
VALUES
('Café Molido','Café artesanal molido'),
('Café en Grano','Granos de café'),
('Bebidas','Bebidas preparadas'),
('Postres','Postres artesanales'),
('Accesorios','Accesorios para café');


/*=========================================================
PROVEEDOR PRINCIPAL
=========================================================*/

INSERT INTO proveedores
(
empresa,
representante,
telefono,
correo,
direccion
)
VALUES
(
'Café Artesanal Ecuador',
'Administrador',
'0988888888',
'proveedor@cafe.com',
'Quito - Ecuador'
);


/*=========================================================
CLIENTE ADMINISTRADOR
=========================================================*/

INSERT INTO clientes
(
cedula,
nombres,
apellidos,
telefono,
correo,
direccion
)
VALUES
(
'0000000000',
'Administrador',
'Sistema',
'0999999999',
'admin@cafe.com',
'Oficina Principal'
);


/*=========================================================
CLIENTE GENERAL
=========================================================*/

INSERT INTO clientes
(
cedula,
nombres,
apellidos,
telefono,
correo,
direccion
)
VALUES
(
'9999999999',
'Cliente',
'General',
'0000000000',
'cliente@cafe.com',
'Consumidor Final'
);


/*=========================================================
USUARIO ADMINISTRADOR
=========================================================*/

INSERT INTO usuarios
(
id_cliente,
id_rol,
id_sucursal,
usuario,
correo,
password
)
VALUES
(
1,
1,
1,
'admin',
'admin@cafe.com',
SHA2('Admin123',256)
);


/*=========================================================
USUARIO NORMAL
=========================================================*/

INSERT INTO usuarios
(
id_cliente,
id_rol,
id_sucursal,
usuario,
correo,
password
)
VALUES
(
2,
2,
1,
'usuario',
'usuario@cafe.com',
SHA2('Usuario123',256)
);
/*=========================================================
        PARTE 5
        TRIGGERS - VISTAS - PROCEDIMIENTOS
=========================================================*/

SET FOREIGN_KEY_CHECKS = 1;

DELIMITER $$

/*=========================================================
TRIGGER: DESCONTAR STOCK AL VENDER
=========================================================*/

CREATE TRIGGER trg_descontar_stock
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    UPDATE productos
    SET stock = stock - NEW.cantidad
    WHERE id_producto = NEW.id_producto;
END$$

/*=========================================================
TRIGGER: AUMENTAR STOCK AL COMPRAR
=========================================================*/

CREATE TRIGGER trg_aumentar_stock
AFTER INSERT ON detalle_compra
FOR EACH ROW
BEGIN
    UPDATE productos
    SET stock = stock + NEW.cantidad
    WHERE id_producto = NEW.id_producto;
END$$

DELIMITER ;



/*=========================================================
VISTA PRODUCTOS
=========================================================*/

CREATE VIEW vw_productos AS

SELECT

p.id_producto,
p.codigo,
p.nombre,
c.nombre AS categoria,
pr.empresa AS proveedor,
p.precio_compra,
p.precio_venta,
p.stock,
p.estado

FROM productos p

INNER JOIN categorias c
ON p.id_categoria=c.id_categoria

INNER JOIN proveedores pr
ON p.id_proveedor=pr.id_proveedor;



/*=========================================================
VISTA VENTAS
=========================================================*/

CREATE VIEW vw_ventas AS

SELECT

v.id_venta,

CONCAT(cl.nombres,' ',cl.apellidos) cliente,

u.usuario,

v.fecha,

v.total,

v.estado

FROM ventas v

INNER JOIN clientes cl
ON v.id_cliente=cl.id_cliente

INNER JOIN usuarios u
ON v.id_usuario=u.id_usuario;



/*=========================================================
VISTA INVENTARIO
=========================================================*/

CREATE VIEW vw_inventario AS

SELECT

codigo,

nombre,

stock,

stock_minimo,

precio_compra,

precio_venta

FROM productos;



/*=========================================================
VISTA PAGOS
=========================================================*/

CREATE VIEW vw_pagos AS

SELECT

p.id_pago,

v.id_venta,

m.nombre metodo_pago,

p.monto,

p.fecha_pago,

p.estado

FROM pagos p

INNER JOIN ventas v
ON p.id_venta=v.id_venta

INNER JOIN metodos_pago m
ON p.id_metodo=m.id_metodo;



DELIMITER $$

/*=========================================================
PROCEDIMIENTO REGISTRAR VENTA
=========================================================*/

CREATE PROCEDURE registrar_venta(

IN p_cliente INT,

IN p_usuario INT,

IN p_total DECIMAL(10,2)

)

BEGIN

INSERT INTO ventas(

id_cliente,

id_usuario,

subtotal,

iva,

descuento,

total

)

VALUES(

p_cliente,

p_usuario,

p_total,

0,

0,

p_total

);

END$$

DELIMITER ;



/*=========================================================
CONSULTAS DE REPORTES
=========================================================*/

-- Productos con poco stock

SELECT *

FROM productos

WHERE stock<=stock_minimo;



-- Ventas realizadas

SELECT *

FROM vw_ventas;



-- Inventario

SELECT *

FROM vw_inventario;



-- Pagos

SELECT *

FROM vw_pagos;



-- Productos más vendidos

SELECT

p.nombre,

SUM(dv.cantidad) total_vendido

FROM detalle_venta dv

INNER JOIN productos p
ON dv.id_producto=p.id_producto

GROUP BY p.nombre

ORDER BY total_vendido DESC;



-- Clientes con más compras

SELECT

c.nombres,

c.apellidos,

COUNT(v.id_venta) total_compras

FROM ventas v

INNER JOIN clientes c
ON v.id_cliente=c.id_cliente

GROUP BY c.id_cliente

ORDER BY total_compras DESC;
/*=========================================================
        PARTE 6
        PROCEDIMIENTOS Y FUNCIONES
=========================================================*/

DELIMITER $$

/*=========================================================
FUNCIÓN CALCULAR IVA
=========================================================*/

CREATE FUNCTION fn_calcular_iva(
    p_subtotal DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    RETURN ROUND(p_subtotal * 0.15,2);
END$$


/*=========================================================
FUNCIÓN CALCULAR TOTAL
=========================================================*/

CREATE FUNCTION fn_calcular_total(
    p_subtotal DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    RETURN ROUND(p_subtotal + (p_subtotal*0.15),2);
END$$


/*=========================================================
PROCEDIMIENTO REGISTRAR VENTA
=========================================================*/

CREATE PROCEDURE sp_registrar_venta(

IN p_cliente INT,
IN p_usuario INT,
IN p_subtotal DECIMAL(10,2)

)

BEGIN

DECLARE v_iva DECIMAL(10,2);
DECLARE v_total DECIMAL(10,2);

SET v_iva=fn_calcular_iva(p_subtotal);

SET v_total=fn_calcular_total(p_subtotal);

INSERT INTO ventas(

id_cliente,
id_usuario,
subtotal,
iva,
descuento,
total

)

VALUES(

p_cliente,
p_usuario,
p_subtotal,
v_iva,
0,
v_total

);

END$$


/*=========================================================
PROCEDIMIENTO REGISTRAR COMPRA
=========================================================*/

CREATE PROCEDURE sp_registrar_compra(

IN p_proveedor INT,
IN p_usuario INT,
IN p_total DECIMAL(10,2)

)

BEGIN

INSERT INTO compras(

id_proveedor,
id_usuario,
subtotal,
iva,
total

)

VALUES(

p_proveedor,
p_usuario,
ROUND(p_total/1.15,2),
ROUND((p_total/1.15)*0.15,2),
p_total

);

END$$


/*=========================================================
PROCEDIMIENTO CAMBIAR PRECIO
=========================================================*/

CREATE PROCEDURE sp_actualizar_precio(

IN p_producto INT,
IN p_precio DECIMAL(10,2)

)

BEGIN

UPDATE productos

SET precio_venta=p_precio

WHERE id_producto=p_producto;

END$$


/*=========================================================
PROCEDIMIENTO ACTUALIZAR STOCK
=========================================================*/

CREATE PROCEDURE sp_actualizar_stock(

IN p_producto INT,
IN p_cantidad INT

)

BEGIN

UPDATE productos

SET stock=stock+p_cantidad

WHERE id_producto=p_producto;

END$$


/*=========================================================
PROCEDIMIENTO ANULAR VENTA
=========================================================*/

CREATE PROCEDURE sp_anular_venta(

IN p_venta INT

)

BEGIN

UPDATE ventas

SET estado='ANULADA'

WHERE id_venta=p_venta;

END$$

DELIMITER ;
/*=========================================================
        PARTE 7
        TRIGGERS Y AUDITORÍA
=========================================================*/

/*=========================================================
TABLA BITÁCORA
=========================================================*/

CREATE TABLE bitacora(

    id_bitacora INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT,

    accion VARCHAR(100) NOT NULL,

    tabla_afectada VARCHAR(50),

    descripcion TEXT,

    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(id_usuario)
    REFERENCES usuarios(id_usuario)
    ON UPDATE CASCADE
    ON DELETE SET NULL

)ENGINE=InnoDB;
DELIMITER $$

CREATE TRIGGER trg_validar_stock

BEFORE INSERT ON detalle_venta

FOR EACH ROW

BEGIN

DECLARE v_stock INT;

SELECT stock
INTO v_stock
FROM productos
WHERE id_producto=NEW.id_producto;

IF v_stock < NEW.cantidad THEN

SIGNAL SQLSTATE '45000'

SET MESSAGE_TEXT='Stock insuficiente para realizar la venta';

END IF;

END$$

DELIMITER ;
DELIMITER $$

CREATE TRIGGER trg_descuento_stock

AFTER INSERT ON detalle_venta

FOR EACH ROW

BEGIN

UPDATE productos

SET stock=stock-NEW.cantidad

WHERE id_producto=NEW.id_producto;

END$$

DELIMITER ;
DELIMITER $$

CREATE TRIGGER trg_ingreso_stock

AFTER INSERT ON detalle_compra

FOR EACH ROW

BEGIN

UPDATE productos

SET stock=stock+NEW.cantidad

WHERE id_producto=NEW.id_producto;

END$$

DELIMITER ;
DELIMITER $$

CREATE TRIGGER trg_movimiento_entrada

AFTER INSERT ON detalle_compra

FOR EACH ROW

BEGIN

INSERT INTO movimiento_inventario(

id_producto,

id_usuario,

tipo,

cantidad,

motivo

)

VALUES(

NEW.id_producto,

1,

'ENTRADA',

NEW.cantidad,

'Compra'

);

END$$

DELIMITER ;
DELIMITER $$

CREATE TRIGGER trg_movimiento_salida

AFTER INSERT ON detalle_venta

FOR EACH ROW
fn_calcular_totalfn_calcular_total
BEGIN
-- SET GLOBAL event_scheduler = ON;
DELIMITER $$
DELIMITER $$
CREATE TRIGGER trg_movimiento_inventario_venta
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    INSERT INTO movimiento_inventario (id_producto, id_usuario, tipo, cantidad, motivo)
    VALUES (NEW.id_producto, 1, 'SALIDA', NEW.cantidad, 'Venta');
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_bitacora_usuario
AFTER INSERT ON usuarios
FOR EACH ROW
BEGIN
    INSERT INTO bitacora(id_usuario, accion, tabla_afectada, descripcion)
    VALUES (NEW.id_usuario, 'INSERT', 'USUARIOS', CONCAT('Usuario creado: ', NEW.usuario));
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_eliminar_producto
BEFORE DELETE ON productos
FOR EACH ROW
BEGIN
    INSERT INTO bitacora(accion, tabla_afectada, descripcion)
    VALUES ('DELETE', 'PRODUCTOS', CONCAT('Producto eliminado: ', OLD.nombre));
END$$

DELIMITER ;

/*=========================================================
INVENTARIO Y REPORTES - ACTUALIZAR EXISTENCIAS EN INVENTARIO
=========================================================*/

DELIMITER $$

CREATE TRIGGER trg_inventario_entrada
AFTER INSERT ON detalle_compra
FOR EACH ROW
BEGIN
    UPDATE inventario
    SET entradas = entradas + NEW.cantidad,
        existencia = existencia + NEW.cantidad
    WHERE id_producto = NEW.id_producto;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_inventario_salida
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    UPDATE inventario
    SET salidas = salidas + NEW.cantidad,
        existencia = existencia - NEW.cantidad
    WHERE id_producto = NEW.id_producto;
END$$

DELIMITER ;

-- Vistas
CREATE OR REPLACE VIEW vw_inventario_general AS
SELECT p.codigo, p.nombre, c.nombre AS categoria, i.entradas, i.salidas, i.existencia, p.precio_compra, p.precio_venta
FROM productos p
INNER JOIN inventario i ON p.id_producto=i.id_producto
INNER JOIN categorias c ON p.id_categoria=c.id_categoria;

CREATE OR REPLACE VIEW vw_productos_mas_vendidos AS
SELECT p.id_producto, p.nombre, SUM(dv.cantidad) cantidad_vendida, SUM(dv.subtotal) total_vendido
FROM detalle_venta dv
INNER JOIN productos p ON dv.id_producto=p.id_producto
GROUP BY p.id_producto, p.nombre
ORDER BY cantidad_vendida DESC;

CREATE OR REPLACE VIEW vw_ventas_usuario AS
SELECT u.usuario, COUNT(v.id_venta) numero_ventas, SUM(v.total) total_vendido
FROM ventas v
INNER JOIN usuarios u ON v.id_usuario=u.id_usuario
GROUP BY u.id_usuario, u.usuario;

CREATE OR REPLACE VIEW vw_clientes_frecuentes AS
SELECT c.id_cliente, CONCAT(c.nombres,' ',c.apellidos) cliente, COUNT(v.id_venta) compras, SUM(v.total) total_gastado
FROM clientes c
INNER JOIN ventas v ON c.id_cliente=v.id_cliente
GROUP BY c.id_cliente, cliente
ORDER BY compras DESC;

CREATE OR REPLACE VIEW vw_compras_proveedor AS
SELECT pr.empresa, COUNT(c.id_compra) compras, SUM(c.total) monto
FROM compras c
INNER JOIN proveedores pr ON c.id_proveedor=pr.id_proveedor
GROUP BY pr.id_proveedor, pr.empresa;

CREATE OR REPLACE VIEW vw_ingresos_diarios AS
SELECT DATE(fecha) fecha, COUNT(*) ventas, SUM(total) ingresos
FROM ventas
WHERE estado='PAGADA'
GROUP BY DATE(fecha)
ORDER BY fecha DESC;

CREATE OR REPLACE VIEW vw_stock_bajo AS
SELECT codigo, nombre, stock, stock_minimo
FROM productos
WHERE stock<=stock_minimo;

-- Consultas rápidas a Vistas
SELECT * FROM vw_inventario_general;
SELECT * FROM vw_productos_mas_vendidos;
SELECT * FROM vw_clientes_frecuentes;
SELECT * FROM vw_compras_proveedor;
SELECT * FROM vw_ventas_usuario;
SELECT * FROM vw_ingresos_diarios;
SELECT * FROM vw_stock_bajo;

/*=========================================================
PARTE 9 - CONFIGURACIÓN DEL SISTEMA
=========================================================*/

CREATE TABLE configuracion(
    id_configuracion INT AUTO_INCREMENT PRIMARY KEY,
    nombre_empresa VARCHAR(150) NOT NULL,
    ruc VARCHAR(13) NOT NULL UNIQUE,
    direccion VARCHAR(250),
    telefono VARCHAR(20),
    correo VARCHAR(100),
    pagina_web VARCHAR(100),
    moneda VARCHAR(10) DEFAULT 'USD',
    iva DECIMAL(5,2) DEFAULT 15.00,
    logo VARCHAR(255),
    mensaje_factura VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO configuracion(nombre_empresa, ruc, direccion, telefono, correo, pagina_web, moneda, iva, mensaje_factura)
VALUES ('CAFÉ ARTESANAL', '1799999999001', 'Quito - Ecuador', '0988062935', 'info@coffe_Drink.com', 'www.cafeartesanal.com', 'USD', 15, 'Gracias por su compra.');

CREATE TABLE caja(
    id_caja INT AUTO_INCREMENT PRIMARY KEY,
    fecha_apertura DATETIME,
    fecha_cierre DATETIME,
    monto_inicial DECIMAL(10,2),
    monto_final DECIMAL(10,2),
    estado ENUM('ABIERTA','CERRADA') DEFAULT 'ABIERTA',
    id_usuario INT,
    FOREIGN KEY(id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE arqueo_caja(
    id_arqueo INT AUTO_INCREMENT PRIMARY KEY,
    id_caja INT,
    ventas_efectivo DECIMAL(10,2),
    ventas_tarjeta DECIMAL(10,2),
    ventas_transferencia DECIMAL(10,2),
    total DECIMAL(10,2),
    observacion VARCHAR(250),
    FOREIGN KEY(id_caja) REFERENCES caja(id_caja)
);

CREATE TABLE promociones(
    id_promocion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    descripcion VARCHAR(200),
    descuento DECIMAL(5,2),
    fecha_inicio DATE,
    fecha_fin DATE,
    estado ENUM('ACTIVA','INACTIVA') DEFAULT 'ACTIVA'
);

CREATE TABLE producto_promocion(
    id_producto INT,
    id_promocion INT,
    PRIMARY KEY(id_producto,id_promocion),
    FOREIGN KEY(id_producto) REFERENCES productos(id_producto),
    FOREIGN KEY(id_promocion) REFERENCES promociones(id_promocion)
);

INSERT INTO promociones(nombre, descripcion, descuento, fecha_inicio, fecha_fin)
VALUES
('Semana del Café', 'Promoción especial', 10, '2026-01-01', '2026-12-31'),
('Cliente Frecuente', 'Descuento permanente', 5, '2026-01-01', '2030-12-31');

INSERT INTO productos(id_categoria, id_proveedor, codigo, nombre, descripcion, precio_compra, precio_venta, stock, stock_minimo)
VALUES
(1,1,'CAF001','Café Molido Premium','500 gramos de café molido artesanal con perfil equilibrado, aroma suave y buena presencia en taza para consumo diario.',5.00,8.00,100,20),
(1,1,'CAF002','Café Orgánico','250 gramos de café orgánico con notas limpias, tueste amable y una experiencia ligera para quienes prefieren una taza delicada.',4.50,7.50,80,20),
(2,1,'CAF003','Café en Grano','1 kilogramo de granos seleccionados para molienda fresca, ideal para conservar aroma y controlar intensidad en cada preparación.',12.00,18.00,40,10),
(3,1,'BEB001','Capuccino','Bebida caliente cremosa con textura suave y sabor balanceado, pensada para acompañar desayunos o pausas cortas.',1.20,2.50,150,30),
(3,1,'BEB002','Latte','Bebida caliente de perfil más suave y lechoso, con una preparación cómoda para clientes que buscan una taza amable.',1.30,2.80,150,30);

INSERT INTO clientes(cedula, nombres, apellidos, telefono, correo, direccion)
VALUES
('0101010101','Juan','Pérez','0991111111','juan@gmail.com','Quito'),
('0202020202','María','Gómez','0992222222','maria@gmail.com','Quito'),
('0303030303','Carlos','Lopez','0993333333','carlos@gmail.com','Quito');

INSERT INTO proveedores(empresa, representante, telefono, correo, direccion)
VALUES
('Café Loja','Pedro Torres','0981111111','ventas@lojacafe.com','Loja'),
('Café Manabí','Luis Pérez','0982222222','ventas@manabicafe.com','Manabí');

/*=========================================================
PARTE 10 - OPTIMIZACIÓN Y SEGURIDAD
=========================================================*/

ALTER TABLE productos ADD CONSTRAINT chk_precio_compra CHECK(precio_compra>=0);
ALTER TABLE productos ADD CONSTRAINT chk_precio_venta CHECK(precio_venta>=0);
ALTER TABLE productos ADD CONSTRAINT chk_stock CHECK(stock>=0);
ALTER TABLE ventas ADD CONSTRAINT chk_total CHECK(total>=0);
ALTER TABLE pagos ADD CONSTRAINT chk_pago CHECK(monto>=0);

CREATE INDEX idx_producto_codigo ON productos(codigo);
CREATE INDEX idx_producto_nombre ON productos(nombre);
CREATE INDEX idx_cliente_cedula ON clientes(cedula);
CREATE INDEX idx_usuario_correo ON usuarios(correo);
CREATE INDEX idx_compra_usuario ON compras(id_usuario);
CREATE INDEX idx_venta_cliente ON ventas(id_cliente);
CREATE INDEX idx_detalle_producto ON detalle_venta(id_producto);
CREATE INDEX idx_pago_metodo ON pagos(id_metodo);

CREATE VIEW vw_dashboard AS
SELECT
    (SELECT COUNT(*) FROM productos) productos,
    (SELECT COUNT(*) FROM clientes) clientes,
    (SELECT COUNT(*) FROM usuarios) usuarios,
    (SELECT COUNT(*) FROM ventas) ventas,
    (SELECT COUNT(*) FROM compras) compras,
    (SELECT SUM(total) FROM ventas WHERE estado='PAGADA') ingresos;

CREATE VIEW vw_ganancias AS
SELECT p.nombre, SUM((dv.precio_unitario-p.precio_compra)*dv.cantidad) utilidad
FROM detalle_venta dv
INNER JOIN productos p ON dv.id_producto=p.id_producto
GROUP BY p.nombre;

-- Linea comentada para evitar error 1227 en Aiven Cloud
-- SET GLOBAL event_scheduler = ON;

DELIMITER $$

CREATE EVENT IF NOT EXISTS evento_bitacora
ON SCHEDULE EVERY 30 DAY
DO
BEGIN
    DELETE FROM bitacora
    WHERE fecha < DATE_SUB(NOW(), INTERVAL 1 YEAR);
END$$

DELIMITER ;

mysqldump -u root -p cafe_artesanal > respaldo.sql
mysql -u root -p cafe_artesanal < respaldo.sql
Usuario:
Rosy2026

Contraseña:
Eminico24.

Usuario:
Rosa

Contraseña:
Rous123.
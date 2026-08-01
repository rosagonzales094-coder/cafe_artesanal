USE cafe_artesanal;

INSERT INTO productos (
  id_categoria,
  id_proveedor,
  codigo,
  nombre,
  descripcion,
  precio_compra,
  precio_venta,
  stock,
  stock_minimo,
  unidad,
  estado
) VALUES
(2, 1, 'CAF-ZAR-250G', 'Cafe Zaruma Origen 250g', 'Cafe en grano de altura con tueste medio, aroma limpio y taza equilibrada. Ideal para iniciar el dia con un perfil suave y constante.', 6.50, 12.50, 40, 5, 'Bolsa', 'ACTIVO'),
(1, 1, 'CAF-ZAR-500M', 'Cafe Zaruma Molido 500g', 'Cafe molido artesanal con notas de cacao, cuerpo medio y molienda lista para preparaciones rapidas y uniformes.', 7.20, 15.00, 35, 5, 'Bolsa', 'ACTIVO'),
(2, 1, 'CAF-ZAR-1KG', 'Cafe Zaruma Premium 1kg', 'Seleccion especial de granos de Zaruma pensada para hogares o negocios que consumen cafe todos los dias.', 12.90, 24.90, 25, 5, 'Bolsa', 'ACTIVO'),
(1, 1, 'CAF-DEC-250G', 'Cafe Descafeinado 250g', 'Perfil suave y balanceado para disfrutar cafe en la noche o en momentos de baja cafeina.', 5.80, 11.50, 30, 5, 'Bolsa', 'ACTIVO'),
(5, 1, 'PACK-DEG-4', 'Pack Degustacion Zaruma', 'Cuatro presentaciones de cafe artesanal para comparar sabores, intensidades y aromas en una sola compra.', 13.00, 22.90, 20, 5, 'Caja', 'ACTIVO'),
(6, 1, 'EL-GEI-01', 'Cafe Geisha Origen El Oro', 'Cafe Geisha de El Oro con notas florales, dulzura marcada y acidez balanceada para una taza suave y elegante.', 10.50, 18.90, 30, 5, 'Bolsa', 'ACTIVO'),
(6, 1, 'EL-BOU-01', 'Cafe Molido Espresso Bourbon', 'Cafe Bourbon molido para espresso, moka y prensa francesa, con cuerpo medio, notas de chocolate y taza redonda.', 9.20, 16.50, 28, 5, 'Bolsa', 'ACTIVO'),
(6, 1, 'EL-TYP-01', 'Reserva Typica de Altura', 'Reserva Typica de altura de Zaruma con aroma intenso, final limpio y perfil clasico para paladares exigentes.', 11.40, 20.00, 24, 5, 'Bolsa', 'ACTIVO'),
(4, 1, 'ACC-COMP-01', 'Compresa termica para cafe', 'Compresa termica reutilizable para conservar mejor la temperatura de bebidas durante mas tiempo.', 2.40, 4.50, 40, 8, 'Unidad', 'ACTIVO'),
(4, 1, 'ACC-CAFETERA-01', 'Cafetera prensa francesa 600ml', 'Cafetera tipo prensa francesa de 600 ml para una preparacion manual sencilla y con mejor control de extraccion.', 12.50, 22.00, 18, 4, 'Unidad', 'ACTIVO');

INSERT INTO inventario (id_producto, entradas, salidas, existencia)
SELECT id_producto, stock, 0, stock
FROM productos
WHERE codigo IN (
  'CAF-ZAR-250G',
  'CAF-ZAR-500M',
  'CAF-ZAR-1KG',
  'CAF-DEC-250G',
  'PACK-DEG-4',
  'EL-GEI-01',
  'EL-BOU-01',
  'EL-TYP-01',
  'ACC-COMP-01',
  'ACC-CAFETERA-01'
);

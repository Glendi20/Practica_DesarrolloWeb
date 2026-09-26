/* =========================================================================
   Esquema de referencia según el ERD del reto.
   ⚠ En db_WebDevUMG las tablas YA EXISTEN (las creó el catedrático).
   Este script es solo documentación / para montar una BD local de pruebas.
   ========================================================================= */

IF OBJECT_ID('dbo.Estudiantes') IS NULL
CREATE TABLE dbo.Estudiantes (
    Carnet  VARCHAR(25)    NOT NULL CONSTRAINT PK_Estudiantes PRIMARY KEY,
    Nombre  NVARCHAR(150)  NOT NULL,
    Correo  NVARCHAR(150)  NOT NULL CONSTRAINT UQ_Estudiantes_Correo UNIQUE
);

IF OBJECT_ID('dbo.Misiones') IS NULL
CREATE TABLE dbo.Misiones (
    MisionID     INT IDENTITY(1,1) CONSTRAINT PK_Misiones PRIMARY KEY,
    Nombre       NVARCHAR(100) NOT NULL CONSTRAINT UQ_Misiones_Nombre UNIQUE,
    Descripcion  NVARCHAR(250) NULL
);

IF OBJECT_ID('dbo.EstudianteMisiones') IS NULL
CREATE TABLE dbo.EstudianteMisiones (
    DetalleID      INT IDENTITY(1,1) CONSTRAINT PK_EstudianteMisiones PRIMARY KEY,
    Carnet         VARCHAR(25) NOT NULL
        CONSTRAINT FK1_EstudianteMisiones_Estudiantes REFERENCES dbo.Estudiantes(Carnet),
    MisionID       INT NOT NULL
        CONSTRAINT FK2_EstudianteMisiones_Misiones REFERENCES dbo.Misiones(MisionID),
    Estado         BIT NOT NULL,
    FechaRegistro  DATETIME NOT NULL CONSTRAINT DF_EstudianteMisiones_Fecha DEFAULT GETDATE(),
    CONSTRAINT UQ_EstudianteMision UNIQUE (Carnet, MisionID)
);

/* Consultas útiles para verificar */
-- SELECT * FROM dbo.Misiones;
-- SELECT * FROM dbo.Estudiantes WHERE Carnet = '1890-20-11489';
-- SELECT * FROM dbo.EstudianteMisiones WHERE Carnet = '1890-20-11489';

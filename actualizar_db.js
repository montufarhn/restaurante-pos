const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// --- Configuración de Idioma ---
const lang = process.env.LANG_SHORT || 'en';
const MESSAGES = {
    es: {
        header: '--- Verificando sistema de base de datos ---',
        new_install: 'Instalación nueva detectada: Copiando base_inicial.db a restaurante.db',
        no_base: 'No se encontró base_inicial.db. Se creará una base de datos vacía.',
        existing: 'Base de datos existente. Se conservarán los datos (órdenes, historial).',
        col_exists: 'AVISO: La columna "imagen" ya existía. No se hicieron cambios.',
        error: 'ERROR al actualizar la base de datos:',
        success: 'ÉXITO: Columna "imagen" agregada correctamente.'
    },
    en: {
        header: '--- Verifying database system ---',
        new_install: 'New installation detected: Copying base_inicial.db to restaurante.db',
        no_base: 'base_inicial.db not found. Creating an empty database.',
        existing: 'Existing database found. Data (orders, history) will be preserved.',
        col_exists: 'NOTICE: Column "imagen" already exists. No changes made.',
        error: 'ERROR updating database:',
        success: 'SUCCESS: Column "imagen" added successfully.'
    },
    fr: {
        header: '--- Vérification du système de base de données ---',
        new_install: 'Nouvelle installation détectée : Copie de base_inicial.db vers restaurante.db',
        no_base: 'base_inicial.db introuvable. Création d\'une base de données vide.',
        existing: 'Base de données existante. Les données (commandes, historique) seront conservées.',
        col_exists: 'AVIS : La colonne "imagen" existait déjà. Aucun changement effectué.',
        error: 'ERREUR lors de la mise à jour de la base de données :',
        success: 'SUCCÈS : Colonne "imagen" ajoutée correctement.'
    },
    pt: {
        header: '--- Verificando sistema de banco de dados ---',
        new_install: 'Nova instalação detectada: Copiando base_inicial.db para restaurante.db',
        no_base: 'base_inicial.db não encontrado. Criando um banco de dados vazio.',
        existing: 'Banco de dados existente. Os dados (pedidos, histórico) serão preservados.',
        col_exists: 'AVISO: A coluna "imagen" já existia. Nenhuma alteração feita.',
        error: 'ERRO ao atualizar o banco de dados:',
        success: 'SUCESSO: Coluna "imagen" adicionada corretamente.'
    },
    ja: {
        header: '--- データベースシステムの確認 ---',
        new_install: '新規インストールを検出: base_inicial.db を restaurante.db にコピーしています',
        no_base: 'base_inicial.db が見つかりません。空のデータベースを作成します。',
        existing: '既存のデータベースが見つかりました。データ（注文、履歴）は保持されます。',
        col_exists: '通知: "imagen" カラムは既に存在します。変更はありません。',
        error: 'データベース更新エラー:',
        success: '成功: "imagen" カラムが正常に追加されました。'
    },
    zh: {
        header: '--- 正在验证数据库系统 ---',
        new_install: '检测到新安装：正在将 base_inicial.db 复制到 restaurante.db',
        no_base: '未找到 base_inicial.db。正在创建一个空数据库。',
        existing: '发现现有数据库。数据（订单、历史记录）将被保留。',
        col_exists: '注意："imagen" 列已存在。未进行任何更改。',
        error: '更新数据库时出错：',
        success: '成功："imagen" 列已正确添加。'
    }
};
const t = MESSAGES[lang] || MESSAGES['en'];

const dbPath = path.join(__dirname, 'restaurante.db');
const plantillaPath = path.join(__dirname, 'base_inicial.db');

console.log(t.header);

// 1. Lógica de instalación: Si no existe restaurante.db, copiamos la plantilla (base_inicial.db)
if (!fs.existsSync(dbPath)) {
    if (fs.existsSync(plantillaPath)) {
        console.log(t.new_install);
        fs.copyFileSync(plantillaPath, dbPath);
    } else {
        console.log(t.no_base);
    }
} else {
    console.log(t.existing);
}

// 2. Conectar para aplicar migraciones
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Intentar agregar la columna 'imagen' a la tabla 'menu'
    db.run("ALTER TABLE menu ADD COLUMN imagen TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(t.col_exists);
            } else {
                console.error(t.error, err.message);
            }
        } else {
            console.log(t.success);
        }
    });
});

db.close();
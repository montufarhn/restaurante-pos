using System;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.IO;
using System.Text.RegularExpressions;

namespace RestaurantePOS
{
    public class Launcher : Form
    {
        private NotifyIcon trayIcon;
        private ContextMenu trayMenu;
        private Process process;
        private Label lblStatus;
        private Label lblTitle;
        private Label lblInfo;
        private Button btnOpen;
        private Button btnStop;
        private Button btnRestart;
        private Button btnExit;
        private ComboBox cbLanguage;
        private string systemName = "Sazón 1804 POS"; // Nombre por defecto

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new Launcher());
        }

        public Launcher()
        {
            // 1. Configuración de la Ventana (GUI)
            // Cargar configuración (nombre del sistema)
            LoadConfig();

            this.Text = "Panel de Control - " + systemName;
            this.Size = new Size(400, 500); // Un poco más alto para acomodar elementos
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;

            // Cargar icono
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "public", "favicon.ico");
            Icon appIcon = SystemIcons.Application;
            if (File.Exists(iconPath))
            {
                 try { appIcon = new Icon(iconPath); } catch { }
            }
            this.Icon = appIcon;

            // 2. Elementos Visuales
            // Selector de Idioma
            cbLanguage = new ComboBox();
            cbLanguage.DropDownStyle = ComboBoxStyle.DropDownList;
            cbLanguage.Items.AddRange(new object[] { "Español", "English", "Français", "Português" });
            cbLanguage.SelectedIndex = 0; // Default Español
            cbLanguage.Location = new Point(260, 12);
            cbLanguage.Size = new Size(110, 25);
            cbLanguage.SelectedIndexChanged += (s, e) => UpdateLanguage();

            lblTitle = new Label();
            lblTitle.Text = systemName;
            lblTitle.Font = new Font("Segoe UI", 18, FontStyle.Bold);
            lblTitle.TextAlign = ContentAlignment.MiddleCenter;
            lblTitle.Location = new Point(0, 50); // Bajamos el título para no chocar con el combo
            lblTitle.Size = new Size(400, 40);

            lblStatus = new Label();
            lblStatus.Text = "Iniciando servicios...";
            lblStatus.Font = new Font("Segoe UI", 10);
            lblStatus.TextAlign = ContentAlignment.MiddleCenter;
            lblStatus.Location = new Point(0, 90); // Bajamos el estado
            lblStatus.Size = new Size(400, 30);
            lblStatus.ForeColor = Color.Gray;

            btnOpen = new Button();
            btnOpen.Text = "Abrir Sistema en Navegador";
            btnOpen.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            btnOpen.Location = new Point(50, 140);
            btnOpen.Size = new Size(280, 45);
            btnOpen.Click += OnOpenBrowser;
            btnOpen.BackColor = Color.WhiteSmoke;

            btnStop = new Button();
            btnStop.Text = "Detener Servidor";
            btnStop.Font = new Font("Segoe UI", 10);
            btnStop.Location = new Point(50, 200);
            btnStop.Size = new Size(280, 40);
            btnStop.Click += OnStopManual;

            btnRestart = new Button();
            btnRestart.Text = "Reiniciar Servidor";
            btnRestart.Font = new Font("Segoe UI", 10);
            btnRestart.Location = new Point(50, 250);
            btnRestart.Size = new Size(280, 40);
            btnRestart.Click += OnRestart;

            btnExit = new Button();
            btnExit.Text = "Detener y Salir";
            btnExit.Font = new Font("Segoe UI", 10);
            btnExit.Location = new Point(50, 340); // Abajo del todo
            btnExit.Size = new Size(280, 40);
            btnExit.Click += OnExit;

            lblInfo = new Label();
            lblInfo.Text = "Minimiza esta ventana para ocultarla en la bandeja.";
            lblInfo.Font = new Font("Segoe UI", 8, FontStyle.Italic);
            lblInfo.TextAlign = ContentAlignment.MiddleCenter;
            lblInfo.Dock = DockStyle.Bottom;
            lblInfo.Height = 40;

            this.Controls.Add(cbLanguage);
            this.Controls.Add(btnOpen);
            this.Controls.Add(btnStop);
            this.Controls.Add(btnRestart);
            this.Controls.Add(btnExit);
            this.Controls.Add(lblStatus);
            this.Controls.Add(lblTitle);
            this.Controls.Add(lblInfo);

            // 3. Configurar Tray Icon
            trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add("Mostrar Panel", (s, e) => RestoreWindow());
            trayMenu.MenuItems.Add("Abrir Navegador", OnOpenBrowser);
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add("Salir", OnExit);

            trayIcon = new NotifyIcon();
            trayIcon.Text = "Restaurante POS - Activo";
            trayIcon.Icon = appIcon;
            trayIcon.ContextMenu = trayMenu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => RestoreWindow();

            // 4. Iniciar proceso
            StartSystem();
            UpdateLanguage();
        }

        private void LoadConfig()
        {
            try
            {
                string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");
                if (File.Exists(configPath))
                {
                    string json = File.ReadAllText(configPath);
                    // Buscamos claves comunes como "nombre_sistema", "nombre", "name" usando Regex simple
                    // para no depender de librerías externas de JSON.
                    Match match = Regex.Match(json, "\"(?:nombre_sistema|nombre|name|restaurant_name)\"\\s*:\\s*\"([^\"]+)\"", RegexOptions.IgnoreCase);
                    if (match.Success)
                    {
                        systemName = match.Groups[1].Value;
                    }
                }
            }
            catch { 
                // Si falla, mantenemos el nombre por defecto
            }
        }

        private void UpdateLanguage()
        {
            string lang = cbLanguage.SelectedItem.ToString();

            if (lang == "English")
            {
                this.Text = "Control Panel - " + systemName;
                btnOpen.Text = "Open System in Browser";
                btnStop.Text = "Stop Server";
                btnRestart.Text = "Restart Server";
                btnExit.Text = "Exit";
                lblInfo.Text = "Minimize to hide in system tray.";
            }
            else if (lang == "Français")
            {
                this.Text = "Panneau de Configuration - " + systemName;
                btnOpen.Text = "Ouvrir le Système";
                btnStop.Text = "Arrêter le Serveur";
                btnRestart.Text = "Redémarrer le Serveur";
                btnExit.Text = "Quitter";
                lblInfo.Text = "Minimiser pour cacher dans la barre.";
            }
            else if (lang == "Português")
            {
                this.Text = "Painel de Controle - " + systemName;
                btnOpen.Text = "Abrir Sistema";
                btnStop.Text = "Parar Servidor";
                btnRestart.Text = "Reiniciar Servidor";
                btnExit.Text = "Sair";
                lblInfo.Text = "Minimize para ocultar na bandeja.";
            }
            else // Español
            {
                this.Text = "Panel de Control - " + systemName;
                btnOpen.Text = "Abrir Sistema en Navegador";
                btnStop.Text = "Detener Servidor";
                btnRestart.Text = "Reiniciar Servidor";
                btnExit.Text = "Salir";
                lblInfo.Text = "Minimiza esta ventana para ocultarla en la bandeja.";
            }
        }

        private void RestoreWindow()
        {
            this.Show();
            this.WindowState = FormWindowState.Normal;
            this.ShowInTaskbar = true;
        }

        protected override void OnResize(EventArgs e)
        {
            if (this.WindowState == FormWindowState.Minimized)
            {
                this.Hide();
                this.ShowInTaskbar = false;
                trayIcon.ShowBalloonTip(2000, "Sazón 1804 POS", "El servidor sigue ejecutándose en segundo plano.", ToolTipIcon.Info);
            }
            base.OnResize(e);
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            // Asegurar que se cierre el proceso al cerrar la ventana
            StopSystem();
            base.OnFormClosing(e);
        }

        private void StartSystem()
        {
            try
            {
                lblStatus.Text = "Estado: Iniciando...";
                lblStatus.ForeColor = Color.Orange;
                
                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = "iniciar_sistema.bat";
                startInfo.WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory;
                startInfo.WindowStyle = ProcessWindowStyle.Hidden;
                startInfo.CreateNoWindow = true;
                startInfo.UseShellExecute = false;

                // Intentar evitar que Node abra el navegador automáticamente
                startInfo.EnvironmentVariables["BROWSER"] = "none";
                startInfo.EnvironmentVariables["NO_OPEN"] = "true";

                process = Process.Start(startInfo);
                
                lblStatus.Text = "Estado: Servidor Activo (Online)";
                lblStatus.ForeColor = Color.Green;
            }
            catch (Exception ex)
            {
                lblStatus.Text = "Estado: Error";
                lblStatus.ForeColor = Color.Red;
                MessageBox.Show("Error al iniciar el sistema: " + ex.Message, "Error POS", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void OnOpenBrowser(object sender, EventArgs e)
        {
            // Abre el navegador predeterminado en el puerto 3000
            Process.Start("http://localhost:3000");
        }

        private void OnStopManual(object sender, EventArgs e)
        {
            StopSystem();
            lblStatus.Text = "Estado: Detenido";
            lblStatus.ForeColor = Color.Red;
        }

        private void OnRestart(object sender, EventArgs e)
        {
            StopSystem();
            StartSystem();
        }

        private void OnExit(object sender, EventArgs e)
        {
            StopSystem();
            trayIcon.Visible = false;
            Application.Exit();
        }

        private void StopSystem()
        {
            if (process != null && !process.HasExited)
            {
                try
                {
                    // Usamos taskkill para asegurar que se cierre el árbol de procesos (cmd -> node)
                    ProcessStartInfo killInfo = new ProcessStartInfo();
                    killInfo.FileName = "taskkill";
                    killInfo.Arguments = "/F /T /PID " + process.Id;
                    killInfo.CreateNoWindow = true;
                    killInfo.UseShellExecute = false;
                    Process.Start(killInfo).WaitForExit();
                }
                catch { }
            }
        }
    }
}
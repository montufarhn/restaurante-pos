using System;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.IO;

namespace RestaurantePOS
{
    public class Launcher : Form
    {
        private NotifyIcon trayIcon;
        private ContextMenu trayMenu;
        private Process process;

        [STAThread]
        public static void Main()
        {
            Application.Run(new Launcher());
        }

        public Launcher()
        {
            // 1. Configurar el menú del clic derecho en el icono
            trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add("Abrir Sistema (Navegador)", OnOpenBrowser);
            trayMenu.MenuItems.Add("-"); // Separador
            trayMenu.MenuItems.Add("Reiniciar Servidor", OnRestart);
            trayMenu.MenuItems.Add("Cerrar Sistema", OnExit);

            // 2. Configurar el icono de la bandeja
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Restaurante POS - Servidor Activo";
            
            // Intentar cargar un icono personalizado si existe, sino usar el genérico
            // Puedes poner un archivo 'favicon.ico' en la carpeta public o raíz
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "public", "favicon.ico");
            if (File.Exists(iconPath))
            {
                 try { trayIcon.Icon = new Icon(iconPath); }
                 catch { trayIcon.Icon = SystemIcons.Application; }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.ContextMenu = trayMenu;
            trayIcon.Visible = true;

            // 3. Iniciar el proceso bat oculto
            StartSystem();
        }

        protected override void OnLoad(EventArgs e)
        {
            Visible = false;       // Ocultar el formulario (ventana)
            ShowInTaskbar = false; // No mostrar en la barra de tareas inferior
            base.OnLoad(e);
        }

        private void StartSystem()
        {
            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = "iniciar_sistema.bat";
                startInfo.WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory;
                // Estos comandos ocultan la ventana negra (CMD)
                startInfo.WindowStyle = ProcessWindowStyle.Hidden;
                startInfo.CreateNoWindow = true;
                startInfo.UseShellExecute = false;

                process = Process.Start(startInfo);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al iniciar el sistema: " + ex.Message, "Error POS", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void OnOpenBrowser(object sender, EventArgs e)
        {
            // Abre el navegador predeterminado en el puerto 3000
            Process.Start("http://localhost:3000");
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
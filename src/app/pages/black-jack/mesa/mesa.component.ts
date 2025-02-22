import { Component, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { CrupierComponent } from '../crupier/crupier.component';
import { JugadorComponent } from '../jugador/jugador.component';
import { CartaService } from '../../../services/carta.service';
import { ICrupier } from '../../../interfaces/i-crupier';
import { IJugador } from '../../../interfaces/i-jugador';
import { IswalMessageCommunicationDto } from '../../../interfaces/dtos/iswal-message-communication-dto';
import swal from 'sweetalert2';
import { IRequestCartaDto } from '../../../interfaces/dtos/i-request-carta-dto';
import { JuegoService } from '../../../services/juego.service';
import { SecurityService } from '../../../services/security/security.service';
import { UpdateGameStatusRequestDto } from '../../../interfaces/dtos/i-update-game-status-request-dto';
import { i18nMetaToJSDoc } from '@angular/compiler/src/render3/view/i18n/meta';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-mesa',
  templateUrl: './mesa.component.html',
  styleUrls: ['./mesa.component.css']
})
export class MesaComponent implements OnInit {
  fondo = '../../../../assets/img/background/Pano-transformedd.jpg';

  crupier!: ICrupier;
  jugador!: IJugador;
  ganaJugador: boolean = false;
  esEmpate: boolean = false;
  private subscription: Subscription = new Subscription();
  @ViewChild(CrupierComponent) crupierComponent!: CrupierComponent;
  @ViewChild(JugadorComponent) jugadorComponent!: JugadorComponent;

  constructor(private juegoService: JuegoService, private securityService: SecurityService, private spinner: NgxSpinnerService) { }

  ngOnInit(): void {
    this.crupier = {} as ICrupier;
    this.jugador = {} as IJugador;
    this.loadActiveGame();
  }

  loadActiveGame(): void {
    this.spinner.show();
    this.subscription.add(
      this.juegoService.loadActiveGame(this.securityService.getUserFromLocalStorage().id).subscribe({
        next: (result) => {
          console.log(result);
          if (result != null && result != undefined && result?.active) {
            this.securityService.setCurrentGame(result.juegoDto);
            this.jugadorComponent.setPreviousCards(result.cartasUsuario);
            this.crupierComponent.setPreviousCards(result.cartasCrupier);
            this.jugadorComponent.juegoEnCurso = result.active;
            this.spinner.hide();
          }
          this.spinner.hide();
        },
        error: (error) => { this.spinner.hide(); this.displayErrors("Error al cargar la informacion de los juegos pendientes.", "Error"); }
      })
    )
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  updateCrupier(crupier: ICrupier): void {
    Object.assign(this.crupier, crupier);
  }

  updateJugador(jugador: IJugador): void {
    Object.assign(this.jugador, jugador);
    this.checkGrameStatus(this.jugador.score, this.crupier.score, this.jugador.score != 0 && (this.crupier.score > 17 || this.jugador.score > 21));
  }

  terminarJuego(param: any): void {
    swal.fire({
      title: 'Esta seguro?',
      text: "Esta por de finalizar la partida.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.jugadorComponent.juegoEnCurso = false;
        this.crupierComponent.swipeCard();
        this.crupierComponent.completeMinRequiredScore();
        setTimeout(() => {
          this.checkGrameStatus(this.jugador.score, this.crupier.score, this.jugador.score != 0 && this.crupier.score != 0);
        }, 5000);
      }
    });
  }

  startNewGame(any: any): void {
    this.spinner.show();
    this.subscription.add(
      this.juegoService.addJuego(this.securityService.getUserFromLocalStorage()?.id).subscribe({
        next: (result) => {
          this.securityService.removeCurrentGame();
          this.securityService.setCurrentGame(result);
          this.crupierComponent.setCartaCrupier(2);
          this.jugadorComponent.solicitarNuevaCarta(2);
          this.jugadorComponent.juegoEnCurso = true;
          this.spinner.hide();
        },
        error: (error) => { this.spinner.hide(); this.displayWarning("¡Tenemos un problema, la partida no se pudo iniciar.!", "¡Error!"); }
      })
    )

  }

  checkGrameStatus(jugadorScore: number, crupierScore: number, ready: boolean): void {
    if (jugadorScore == 21 && crupierScore != 21 && ready) {
      this.displaySuccess("¡Black Jack!", "¡Ganaste la partida!.");
      this.ganaJugador = true;
      this.resetMesa();
      return;
    }

    if (crupierScore == 21 && jugadorScore != 21 && ready) {
      this.displayErrors("¡Perdiste la partida!. El crupier hizo blackjack.", "Oops...");
      this.ganaJugador = false;
      this.resetMesa();
      return;
    }

    if (jugadorScore > 21 && ready) {
      this.displayErrors("¡Perdiste la partida! Superaste los 21 puntos.", "Oops...");
      this.ganaJugador = false;
      this.resetMesa();
      return;
    }

    if (jugadorScore < crupierScore && ready) {
      this.displayErrors("¡Perdiste la partida!. El crupier tiene mas puntos.", "Oops...");
      this.ganaJugador = false;
      this.resetMesa();
      return;
    }

    if (jugadorScore > crupierScore && ready) {
      this.displaySuccess("¡Felicitaciones!.", "¡Ganaste la partida!.");
      this.ganaJugador = true;
      this.resetMesa();
      return;
    }

    if (jugadorScore == crupierScore && ready) {
      this.displayWarning("¡Tenes el mismo puntaje que el crupier!", "¡Empate!");
      this.esEmpate = true;
      this.resetMesa();
      return;
    }
  }

  resetMesa(): void {
    this.spinner.show();
    this.subscription.add(
      this.juegoService.updateGameStatus({ idUsuario: this.securityService.getUserFromLocalStorage().id, idJuego: this.securityService.getGameFromLocalStorage().id, scoreCrupier: this.crupier.score, scoreJugador: this.jugador.score, ganaJugador: this.ganaJugador, esEmpate: this.esEmpate } as UpdateGameStatusRequestDto).subscribe({
        next: (result) => {
          this.crupierComponent.resetCrupier();
          this.jugadorComponent.resetJugador();
          this.jugador = {} as IJugador;
          this.crupier = {} as ICrupier;
          this.jugadorComponent.juegoEnCurso = false;
          this.ganaJugador = false;
          this.esEmpate = false;
          this.spinner.hide();
        },
        error: (error) => {
          this.spinner.hide();
          this.displayErrors("No pudimos terminar la partida.", "Error");
        }
      })
    );
  }

  displaySwalMessage(dto: IswalMessageCommunicationDto): void {
    if (dto.icon == "error") {
      this.displayErrors(dto.message, dto.title);
    }

    if (dto.icon = "warning") {
      this.displayWarning(dto.message, dto.title);
    }

    if (dto.icon = "success") {
      this.displaySuccess(dto.message, dto.title);
    }
  }

  displayErrors(errorMessage: string, title: string): void {
    swal.fire({
      icon: 'error',
      title: title,
      text: errorMessage,
    });
  }

  displaySuccess(title: string, text: string): void {
    swal.fire({
      icon: 'success',
      title: title,
      text: text,
      showCancelButton: false,
      confirmButtonText: 'OK'
    });
  }

  displayWarning(title: string, text: string): void {
    swal.fire({
      icon: 'warning',
      title: title,
      text: text,
      showCancelButton: false,
      confirmButtonText: 'OK'
    });
  }
}

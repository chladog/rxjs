import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { map, switchMap, mergeMap, timer } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  vnejsiObs$ = timer(0, 1000).pipe(
  );
  vnitrniObs$ = timer(0, 330).pipe(
    map((i) => i * 2)
  );
  zkombinovanaObsSwitch$ = this.vnejsiObs$.pipe(
    /** pokud na vnější observable dojde k emitování (např. při navigaci na jinou stranku změna parametru v cestě /items/:itemId z item1 na item2), 
     *    subscribe vnitřní observable se zruší a nahradí novým - tedy začne počítat znovu 0 ... 2 ... 4 
     *    (např. pokud je vnitřní observable http request "getItemDetail()" při změně param :itemId se zruší probíhající request na item1
     *    a začne nový request na getItemDetail(item2)
     */ 
    switchMap(
      (vne) => // vnejsi hodnota z observable vnejsiObs$, např. zde 1,2,3, v app: :itemId -> item1, item2...
        this.vnitrniObs$.pipe(
          map((vni) => ({ // // vnitřní observable při změně vnějšího observable přestane emitovat,
          // tedy začne počítat znovu od 0, např. zde 0, 2, 4, v app: objekt ItemDetail -> {id: item1, data: {...}}, {id: item2, data: {...}}
          vypocet: `${vne} * ${vni}`,
          vysledek: vne * vni
        }))))
  );
  zkombinovanaObsMerge$ = this.vnejsiObs$.pipe(
    /** pokud na vnější observable dojde k emitování (např. při navigaci na jinou stranku změna parametru v cestě /items/:itemId z item1 na item2), 
     *    subscribe vnitřní observable se NEzruší a NEnahradí novým, tedy při vnější "2" vnitřní pokračuje v 6, 8, 10. 
     *    Při dalším vnějším emit "3" pokračuje vnitřní 12, 14, 16...
     *    (např. pokud je vnitřní observable http request "getItemDetail()" při změně param :itemId se NEzruší probíhající request na item1
     *    a začne nový request na getItemDetail(item2) => pokud z nějakého důvodu je getItemDetail(item2) rychlejší než getItemDetail(item1)
     *    stane se, že se v app zobrazí data na cestě /items/item2 data item1 - protože to je poslední request, který dorazil
     */ 
    mergeMap(
      (vne) => // vnejsi hodnota z observable vnejsiObs$, např. zde 1,2,3, v app: :itemId -> item1, item2...
        this.vnitrniObs$.pipe(
          map((vni) => ({ // vnitřní observable při změně vnějšího observable NEpřestane emitovat,
        // pokračuje v emitování hodnot 6, 8, 10, 12, 14, 16...
        vypocet: `${vne} * ${vni}`,
        vysledek: vne * vni
      }))))
  );
  /**
   *  switchMap vs mergeMap - flattening operátory (převádějí vnitřní observable na vnější).
   *  Tedy používají se ke ZKOMBINOVÁNÍ 2 nebo více observables.
   *  O observable přemýšlej jako o streamu, tedy toku dat v čase. 
   * 
   * 
   * Tedy v případě že mě zajímá obsah vnitřní observable výhradně v závislosti na obsahu vnější observable
   *  => vždy použijem switchMap
   *  - jelikož zruší předchozí vnitřní observable, pokud nová hodnota na vnější dorazí. 
   *    Použijeme pokud nás zajímá pouze poslední hodnota
   *    např: 
   *      - autocomplete search - pokud uživatel začne psát nový výraz, chceme zrušit probíhající request na starý výraz a začít nový request na nový výraz
   *      - při změně parametru v cestě /items/:itemId z item1 na item2 chci zrušit probíhající request na item1 a začít nový request na item2
   * 
   * 2 observables:
   * vnejši: 1 -> 2 -> 3 -> 4 -> 5
   * vnitřní: A -> B -> C -> D -> E -> F -> G -> H -> I -> J -> K -> L -> M -> N -> O -> P -> Q -> R -> S -> T -> U -> V -> W -> X -> Y -> Z
   * 
   * switchMap:
   * 1A -> 1B -> 1C -> 1D -> 1E -> 2A (písmeno bylo resetováno) -> 2B -> 2C -> 2D -> 2E -> 3A  (písmeno bylo resetováno) -> 3B -> 3C -> 3D -> 3E -> 4A  (písmeno bylo resetováno) -> 4B -> 4C -> 4D -> 4E -> 5A  (písmeno bylo resetováno) -> 5B -> 5C -> 5D -> 5E
   *  
   * ------------------------------------------------------------------------
   *  
   * Pokud nás zajímá obsah vnitřní observable NEZÁVISLE na obsahu vnější observable
   * => použijem mergeMap / concatMap / exhaustMap (záleží na pořadí, jak mají být zpracovány vnitřní observable)
   * - jelikož nepřestane emitovat, pokud nová hodnota na vnější dorazí.
   *   Použijeme pokud nás zajímají všechny hodnoty
   *  např:
   *    - paralelní zpracování requestů
   *     - file upload, když uživatel nahrává více souborů najednou - přišly 3 soubory za sebou na vnější obs, chci ve všech 3 pokračovat s donahráním
   *     - v chat aplikaci chci odeslat (dokončit send requesty) pro všechny nové zprávy:
   *     - pokud uživatel napsal 3 zprávy za sebou (A, B, C), chci odeslat všechny 3 zprávy i přesto, že B a C na server přišly dříve než A
   * 
   * 2 observables:
   * vnejši: 1 -> 2 -> 3 -> 4 -> 5
   * vnitřní: A -> B -> C -> D -> E -> F -> G -> H -> I -> J -> K -> L -> M -> N -> O -> P -> Q -> R -> S -> T -> U -> V -> W -> X -> Y -> Z
   * 
   * mergeMap:
   * 1A -> 1B -> 1C -> 1D -> 1E -> 2G (písmeno pokračuje v abecedě i přese změnu čísla) -> 2H -> 2I -> 2J -> 2K -> 3M  (písmeno pokračue v abecedě i přese změnu čísla) -> 3N -> 3O -> 3P -> 3Q -> 4S  (písmeno pokračuje v abecedě i přese změnu čísla)  -> 4T -> 4U -> 4V -> 4W -> 5Y  (písmeno pokračuje v abecedě i přese změnu čísla)  -> 5Z
   * 
   */

  /**
   * map operátor - transformuje hodnotu z observable - tedy NEKOMBINUJE observables.
   * například:
   *  pokud chci získat z observable časový údaj a převést ho na datum
   *  chci přemapovat data z jedné prop objektu na jinou
   *  chci provést nějaký výpočet s hodnotou z observable např. vynásobit 2 viz výše na vnitrniObs$
   *  tedy jde mi stream dat:
   * 
   *  1 observable:
   *  1 -> 2 -> 3 -> 4 -> 5
   *  map((i) => i * 2)
   *  vznikne nový stream, ale stále je to 1 observable:
   *  2 -> 4 -> 6 -> 8 -> 10
   * 
   */
}

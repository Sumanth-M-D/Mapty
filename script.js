/*Additional features
   1. Edit and delete workouts 
   2. Option to Delete all workouts
   3. sort workouts by certain field 
   4. use API for creation of ID
   5. rebuild the objects from data from local storage  to retain
      prototypal chain, id and date --> (done ✔✔✔✔✔✔✔✔✔✔) 
   6. more realistic error and confirmation messages 

   7. Ability to position the map to show all the workouts at once [very hard]
   8. Draw lines and shapes instead of just points [really really hard]
   
   9. Geocode location from coordinates. [medium]
   10. Displayweather data for workout time and place. [medium]




   */

'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  /*use a static lastId property to keep track of the last used ID,
   ensuring that IDs are unique across all instances of the App class. */
  static lastId = 0;

  constructor(coords, distance, duration, StringDate) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //in minute
    this.id = ++Workout.lastId;
    this.date = this._pasreDateString(StringDate) || new Date();
    this._stringDate = StringDate || this.date.toISOString();
  }
  _setDesription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  _pasreDateString(stringDate) {
    return stringDate ? new Date(stringDate) : null;
  }
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.type = 'running';
    this.calcPace();
    this._setDesription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.type = 'cycling';
    this.calcSPeed();
    this._setDesription();
  }
  calcSPeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([0,0], 2, 2, 100);
// const cycling1 = new Cycling([0,0], 2, 2, 100);
// console.log(run1);
// console.log(cycling1);

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    //get users position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    //1. get current location coordinates -> using geolocation api
    //could also have done by -> geolocation api and map instance [refer chatgpt and google search]
    if (window.navigator.geolocation) {
      //getting the geolocation of the user
      window.navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coordinates = [latitude, longitude];

    // console.log(`https://www.google.com/maps/@${latitude},${longitude},14z?entry=ttu`);

    //display map -> using leaflet library
    this.#map = L.map('map').setView(coordinates, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showform.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showform(event) {
    this.#mapEvent = event;
    //Display form
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(event) {
    //Helper functions
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const allPositive = (...inputs) => inputs.every(input => input > 0);

    event.preventDefault();

    //Get data from the from
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('inputs have to be positive numbers');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('inputs have to be positive numbers');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //add new obejct to workout array
    this.#workouts.push(workout);

    //render workout on map as a marker
    this._renderWorkoutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);

    // Hide form and clear input fields
    this._hideForm();

    //set Local storage to all the workouts
    this._setLocalStorage();

    console.log(workout);
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id=${
      workout.id
    }>
                     <h2 class="workout__title">${workout.description}</h2>
                     <div class="workout__details">
                        <span class="workout__icon">${
                          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                        }</span>
                        <span class="workout__value">${workout.distance}</span>
                        <span class="workout__unit">km</span>
                     </div>
                     <div class="workout__details">
                        <span class="workout__icon">⏱</span>
                        <span class="workout__value">${workout.duration}</span>
                        <span class="workout__unit">min</span>
                     </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
                     <span class="workout__icon">⚡️</span>
                     <span class="workout__value">${workout.pace.toFixed(
                       1
                     )}</span>
                     <span class="workout__unit">min/km</span>
                  </div>
                  <div class="workout__details">
                     <span class="workout__icon">🦶🏼</span>
                     <span class="workout__value">${workout.cadence.toFixed(
                       1
                     )}</span>
                     <span class="workout__unit">spm</span>
                  </div>
               </li>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
                     <span class="workout__icon">⚡️</span>
                     <span class="workout__value">${workout.speed.toFixed(
                       1
                     )}</span>
                     <span class="workout__unit">km/h</span>
                  </div>
                  <div class="workout__details">
                     <span class="workout__icon">⛰</span>
                     <span class="workout__value">${workout.elevation.toFixed(
                       1
                     )}</span>
                     <span class="workout__unit">m</span>
                  </div>
               </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(event) {
    const workoutEl = event.target.closest('.workout');

    if (!workoutEl) return;
    console.log(workoutEl);

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // // using public interface
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    //note: all the prototype chain of JSON converted data will be removed
    /* .'. When retreiving the data from localstorage, you need to to reset 
         the prototype chain, you need to loop over data and create new object instances */
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data.map(workout => {
      let newWorkout;
      if (workout.type === 'running') {
        newWorkout = new Running(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.cadence,
          workout._stringDate
        );
      } else if (workout.type === 'cycling') {
        newWorkout = new Cycling(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.elevation,
          workout._stringDate
        );
      }
      return newWorkout;
    });

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });

    const trial = this.#workouts;
    console.log(data);
    console.log(trial);
  }

  //  _getLocalStorage(){
  //    const data = JSON.parse(localStorage.getItem('workouts'));

  //    if(!data) return;
  //    this.#workouts = data;
  //    this.#workouts.forEach(workout => {
  //       this._renderWorkout(workout);
  //    })
  //  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

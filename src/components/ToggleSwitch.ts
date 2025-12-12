export interface ToggleSwitchOptions {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  ariaLabel?: string;
  leftLabel?: string;
  rightLabel?: string;
  leftLabelClass?: string;
  rightLabelClass?: string;
}

export class ToggleSwitch {
  private container: HTMLDivElement;
  private input: HTMLInputElement;
  private leftLabelEl?: HTMLSpanElement;
  private rightLabelEl?: HTMLSpanElement;
  private changeHandler?: (checked: boolean) => void;
  private static idCounter = 0;

  constructor(options: ToggleSwitchOptions = {}) {
    const uniqueId = `toggle-${ToggleSwitch.idCounter++}`;

    this.container = document.createElement('div');
    this.container.className = 'toggle-switch-container flex items-center gap-1';
    this.container.setAttribute('role', 'group');
    if (options.ariaLabel) {
      this.container.setAttribute('aria-label', options.ariaLabel);
    }

    // Create left label if provided
    if (options.leftLabel) {
      this.leftLabelEl = document.createElement('span');
      this.leftLabelEl.id = `${uniqueId}-left`;
      this.leftLabelEl.textContent = options.leftLabel;
      this.leftLabelEl.className = options.leftLabelClass || '';
      this.container.appendChild(this.leftLabelEl);
    }

    // Create toggle switch
    const label = document.createElement('label');
    label.className = 'toggle-switch';

    this.input = document.createElement('input');
    this.input.type = 'checkbox';
    this.input.className = 'toggle-input';
    this.input.checked = options.checked ?? false;
    this.input.setAttribute('role', 'switch');
    this.input.setAttribute(
      'aria-checked',
      options.checked ? 'true' : 'false'
    );
    if (options.ariaLabel) {
      this.input.setAttribute('aria-label', options.ariaLabel);
    }

    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    slider.setAttribute('aria-hidden', 'true');

    label.appendChild(this.input);
    label.appendChild(slider);
    this.container.appendChild(label);

    // Create right label if provided
    if (options.rightLabel) {
      this.rightLabelEl = document.createElement('span');
      this.rightLabelEl.id = `${uniqueId}-right`;
      this.rightLabelEl.textContent = options.rightLabel;
      this.rightLabelEl.className = options.rightLabelClass || '';
      this.container.appendChild(this.rightLabelEl);
    }

    // Set up change handler
    this.input.addEventListener('change', () => {
      this.input.setAttribute('aria-checked', this.input.checked ? 'true' : 'false');
      this.changeHandler?.(this.input.checked);
    });

    if (options.onChange) {
      this.changeHandler = options.onChange;
    }
  }

  get element(): HTMLDivElement {
    return this.container;
  }

  get checked(): boolean {
    return this.input.checked;
  }

  set checked(value: boolean) {
    this.input.checked = value;
    this.input.setAttribute('aria-checked', value ? 'true' : 'false');
  }

  setLeftLabel(text: string, className?: string): void {
    if (this.leftLabelEl) {
      this.leftLabelEl.textContent = text;
      if (className) {
        this.leftLabelEl.className = className;
      }
    }
  }

  setRightLabel(text: string, className?: string): void {
    if (this.rightLabelEl) {
      this.rightLabelEl.textContent = text;
      if (className) {
        this.rightLabelEl.className = className;
      }
    }
  }

  onChange(handler: (checked: boolean) => void): void {
    this.changeHandler = handler;
  }

  destroy(): void {
    this.input.removeEventListener('change', () => {});
    this.container.remove();
  }
}

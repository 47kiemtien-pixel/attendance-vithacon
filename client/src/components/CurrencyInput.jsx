import React from 'react';
import { formatVndInput, parseVndAmount } from '../utils/currency';

const CurrencyInput = ({
  value,
  onValueChange,
  icon: Icon,
  wrapperClassName = '',
  inputClassName = 'form-input',
  iconSize = 16,
  suffix = 'đ',
  placeholder = '650.000',
  ...inputProps
}) => {
  const handleChange = (event) => {
    onValueChange(parseVndAmount(event.target.value));
  };

  return (
    <div className={`currency-input-shell ${wrapperClassName}`.trim()}>
      {Icon && <Icon size={iconSize} />}
      <input
        {...inputProps}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`currency-input-field ${inputClassName}`.trim()}
        value={formatVndInput(value)}
        onChange={handleChange}
        placeholder={placeholder}
      />
      {suffix && <span className="currency-input-suffix">{suffix}</span>}
    </div>
  );
};

export default CurrencyInput;

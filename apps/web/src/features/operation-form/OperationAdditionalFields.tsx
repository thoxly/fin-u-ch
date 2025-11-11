import { Input } from '../../shared/ui/Input';

interface OperationAdditionalFieldsProps {
  description: string;
  onDescriptionChange: (value: string) => void;
}

export const OperationAdditionalFields = ({
  description,
  onDescriptionChange,
}: OperationAdditionalFieldsProps) => {
  return (
    <Input
      label="Описание"
      value={description}
      onChange={(e) => onDescriptionChange(e.target.value)}
      placeholder="Дополнительная информация"
    />
  );
};
